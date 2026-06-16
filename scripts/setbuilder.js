// the main setbuilding and optimization class framework

import {
    calcStatEVs,
    toggleSelectedAtk,
    combineRolls,
    evInc,
    maxEVs,
    isEmptyObj,
    sumValues,
    addMixedBenchToStorage,
    sortSpreads
} from './util.js';

class Attack {
    constructor(
        attacker,
        defender,
        move,
        field,
        draining = false,
        damage = {} // cache for this attack evs -> damage:probability map
    ) {
        this.attacker = attacker
        this.defender = defender
        this.move = move
        this.field = field
        this.draining = draining
        this.damage = damage
    }

    getDmg(evs) {
        // adjust for draining moves as well
        let evKey = JSON.stringify(evs)
        if (!this.damage[evKey]) {
            this.draining ? this.attacker.evs = evs : this.defender.evs = evs
            let rawDmg = calc.calculate(gen, this.attacker, this.defender, this.move, this.field).damage
            let chance = 1.0 / rawDmg.length // account for crit and acc here as needed
            let dmg = {}
            rawDmg.forEach((roll) => {
                dmg[roll] = (dmg[roll] || 0) + chance
            })
            this.damage[evKey] = dmg
        }
        return this.damage[evKey]
    }
}

class HPMods {
    constructor(
        healing = {},
        damage = {},
        item = '',
        sub = false,
        other = 0
    ) {
        this.healing = healing
        this.damage = damage
        this.item = item
        this.sub = sub
        this.other = other
    }
}

class Benchmark {
    constructor(
        attacks = [],
        hpmods = new HPMods,
        // damage = {},
        acceptChance = 0,
        category = '',
        evs = {}, // used for ko chance and displayed calcs
        jquery = [], // html for list of attacks
        result = ''
    ) {
        this.attacks = attacks
        this.hpmods = hpmods
        // this.damage = damage
        this.acceptChance = acceptChance
        this.category = category
        this.evs = evs
        this.jquery = jquery
        this.result = result
    }

    getHP(evs) {
        let attack = this.attacks.at(-1)
        let defender = attack.draining ? attack.attacker : attack.defender
        let hp = calcStatEVs(defender, 'hp', evs)
        // apply hpmods here
        return hp
    }

    getCat() {
        let cat = ''
        for (let i = 0; i < this.attacks.length; i++) {
            let atk = this.attacks[i]
            if (!atk.draining && (atk.move.bp !== 0 || ['Fling', 'Natural Gift'].includes(atk.move.name))) {
                let moveCat = atk.move.overrideDefensiveStat === 'def' ? 'Physical' : atk.move.category
                if (!cat) {
                    cat = moveCat
                } else if (cat !== moveCat) {
                    cat = 'Mixed'
                    break
                }
            }
        }
        this.category = cat
        return cat
    }

    //not sure if i will use this
    updateEVs(evs = {}) {
        if (evs) this.evs = evs
        this.attacks.forEach((attack) => {
            attack.draining ? attack.attacker.evs = this.evs : attack.defender.evs = this.evs
        })
    }

    // getDmg(evs = {}) {
    //     let rolls = []
    //     if (evs) {
    //         this.attacks.forEach((attack) => {
    //             attack.draining ? attack.attacker.evs = evs : attack.defender.evs = evs
    //             let rawDmg = attack.getDmg()
    //             let chance = 1.0 / rawDmg.length // account for crit and acc here as needed
    //             let dmg = {}
    //             rawDmg.forEach((roll) => {
    //                 dmg[roll] = (dmg[roll] || 0) + chance
    //             })
    //             rolls.push(dmg)
    //         })
    //     } else {
    //         this.attacks.forEach((attack) => {
    //             rolls.push(attack.damage)
    //         })
    //     }
    //     this.damage = combineRolls(rolls)
    //     return this.damage
    // }

    calculate(evs = this.evs) {
        let result = ': Calculation Failed'
        let koChance = 0.0
        let hp = this.getHP(evs.hp)
        let rolls = []

        this.attacks.forEach((attack) => {
            rolls.push(attack.getDmg(evs))
        })
        let damage = combineRolls(rolls)

        for (let dmg in damage) {
            if (Number(dmg) >= hp) {
                koChance += damage[dmg]
            }
        }

        //koChance = (Math.round(koChance * 100000) / 1000).toFixed(3)
        //this.result = `: ${koChance}% chance to KO` // add dmg range here too
        // conflict where result updates during optimization, will move to different function
        return koChance
    }
}

class pSet {
    constructor(
        benchmarks = [],
        forms = [], // store all forms here ie Megas, Aegislash
        evs = {}, // used for optimized ev spread
        nature = '',
        output = [] // optimized spreads
    ) {
        this.benchmarks = benchmarks
        this.forms = forms,
        this.evs = evs,
        this.nature = nature,
        this.output = output
    }

    evUp(statID) {
        let evs = this.evs[statID]
        if (evs >= maxEVs()) return false
        if (gen != 0) evs = evs - (evs % 4) // if not divisible by 4
        let oldStats = this.forms.flatMap((form) => calcStatEVs(form, statID, evs))
        let statChanged = false
        while (evs < maxEVs() && !statChanged) {
            evs += evInc()
            statChanged = oldStats.some((stat, i) => {
                return stat != calcStatEVs(this.forms[i], statID, evs)
            })
        }
        if (evs != this.evs[statID]) this.evs[statID] = evs
        return statChanged
        // if (!statChanged) return false
        // // update benchmarks with new evs
        // // this.benchmarks.forEach((benchmark) => {
        // //     benchmark.attacks.forEach((attack) => {
        // //         attack.draining ?
        // //             attack.attacker.evs[statID] = evs :
        // //             attack.defender.evs[statID] = evs
        // //     })
        // // })
        // return true
    }

    evDown(statID) {
        let evs = this.evs[statID]
        if (evs <= 0) return false
        if (gen != 0) evs = evs - (evs % 4) // if not divisible by 4
        let oldStats = this.forms.flatMap((form) => calcStatEVs(form, statID, evs))
        let statChanged = false
        while (evs > 0 && !statChanged) {
            evs -= evInc()
            statChanged = oldStats.some((stat, i) => {
                return stat != calcStatEVs(this.forms[i], statID, evs)
            })
        }
        if (evs != this.evs[statID]) this.evs[statID] = evs
        return statChanged
        // if (!statChanged) return false
        // // update benchmarks with new evs
        // // this.benchmarks.forEach((benchmark) => {
        // //     benchmark.attacks.forEach((attack) => {
        // //         attack.draining ?
        // //             attack.attacker.evs[statID] = evs :
        // //             attack.defender.evs[statID] = evs
        // //     })
        // // })
        // return true
    }

    // requires lower and upper limit to be increased by one else infinite loop
    evBinary(statID, upper, lower) {
        if (upper < lower) return false
        let evs = (upper + lower) / 2
        gen == 0 ? evs = Math.floor(evs) : evs = evs - (evs % 4) // round off evs
        this.evs[statID] = evs
        return true
    }

    newBench() {
        this.benchmarks.push(new Benchmark)
        console.log(this)
    }

    removeBench(index) {
        this.benchmarks.splice(index, 1)
        console.log(this)
    }

    addAtk(bench, attacker, defender, move, field) {
        let b = this.benchmarks[bench]
        b.attacks.push(new Attack(
            attacker,
            defender,
            move,
            field
        ))

        // update category of benchmark
        // maybe dont because you have to recalc anyway on remove atk
        // check if draining here too
        // if ((move.bp !== 0 || ['Fling', 'Natural Gift'].includes(move.name))) {
        //     let moveCat = move.overrideDefensiveStat === 'def' ? 'Physical' : move.category
        //     if (!b.category) {
        //         b.category = moveCat
        //     } else if (b.category !== moveCat) {
        //         b.category = 'Mixed'
        //     }
        // }

        //add new form
        // really only care about stats, so i might change this to save some storage space
        if (
            this.forms.every((form) => {
                return JSON.stringify(form.species.baseStats) !== JSON.stringify(defender.species.baseStats)
            })
        ) {
            this.forms.push(defender)
        }

        isEmptyObj(b.evs) ? b.evs = defender.evs : defender.evs = b.evs
        let result = calc.calculate(gen, attacker, defender, move, field)
        b.attacks.at(-1).getDmg(b.evs) // kind of a double up but its fine i guess

        let desc = result.fullDesc(notation, false)
        desc = desc.replaceAll(
            /([0-9]+)( hp |(\+?-?)( atk | def | spa | spd | spe))|\/ |with an ally's |through |boosted /gi,
            ''
        ) // will probably want to keep natures here actually
        desc = desc.slice(0,desc.indexOf(':') + 2) + result.moveDesc(notation)
        let element = $('<li>', {
            class: 'bench-atk',
            text: desc
        })
        b.jquery.push(element)

        console.log(this)
        console.log(result)
        return element
    }

    removeAtk(bench, atk) {
        let b = this.benchmarks[bench]
        b.attacks.splice(atk,1)
        b.jquery.splice(atk,1)
        // need to check forms
        // also recalc bench maybe
        console.log(this)
    }


    minEVsBinary(bench, stat, upper, lower) {
        let minEVs = -1
        while (this.evBinary(stat, upper, lower)) {
            if (bench.calculate(this.evs) > bench.acceptChance) {
                lower = this.evs[stat] + evInc()
            } else {
                upper = this.evs[stat] - evInc()
                minEVs = this.evs[stat] // save the least required evs
            }
        }
        return minEVs
    }

    // returns true if successfully lives the attacks, returns false if koed with max evs
    evUpToPass(bench, stat, ded = true) {
        while (ded) {
            if (!this.evUp(stat)) break
            ded = bench.calculate(this.evs) > bench.acceptChance
        }
        return !ded
    }

    // returns true if successfully lowered evs until failure. returns false if pokemon still survives
    evDownToFail(bench, stat, min, ded = false) {
        while (!ded) {
            if (!this.evDown(stat)) break
            if (this.evs[stat] < min) {
                this.evUp(stat)
                break
            }
            ded = bench.calculate(this.evs) > bench.acceptChance
        }
        return ded
    }

    // still need to cap evs at 508/66
    getSpreads() {
        // hp with 0 defense evs
        // if max hp binary search defense evs (different with mixed benches)
        // this is our starting point ev spread
        // lower hp until benchmark fails
        // raise defense until benchmark passes
        // repeat until 0 hp or max def

        // with mixed benches (phys atk and spec atk in same bench)
        // same hp strat
        // binary def first (arbitrary)
        // if def max, binary spdef
        // lower def + raise spdef until def 0 or spdef max
        // lower hp until fail
        // raise def until pass or max
        // if not pass, raise spdef until pass
        // if pass, lower def + raise spdef until def 0 or spdef max
        // repeat until hp 0 or both def and spdef max

        // always calc mixed benches last bc they can often be avoided by checking other benches

        // calculate with 0 def evs first
        this.output = []
        let sortedBenchmarks = []
        // let hasMixedBench = false
        this.benchmarks.forEach((benchmark) => {
            // dont add empty benchmarks
            // maybe just account for these so you can have hpmods without status move filler
            if (benchmark.attacks.length > 0) {
                // sort benchmarks so that mixed benches are last
                if (benchmark.getCat() === 'Mixed') { // also updates benchmark.category
                    sortedBenchmarks.push(benchmark)
                    // hasMixedBench = true
                } else {
                    sortedBenchmarks.unshift(benchmark)
                }
            }
        })
        this.evs = {
            hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0
        }
        // get starting hp value
        let bulklessHP = 0
        for (let i = 0; i < sortedBenchmarks.length; i++) {
            let benchHP = this.minEVsBinary(sortedBenchmarks[i], 'hp', maxEVs(), bulklessHP)
            if (benchHP === -1 || benchHP > bulklessHP) {
                bulklessHP = benchHP
                if (benchHP === -1) break // stop loop in case max hp is reached early
            }
        }
        this.evs.hp = bulklessHP

        let startingDef = 0
        let startingSpD = 0
        let mixedBenchStorage = []
        // add defense if needed
        if (this.evs.hp === -1) {
            this.evs.hp = maxEVs()
            for (let i = 0; i < sortedBenchmarks.length; i++) {
                let benchmark = sortedBenchmarks[i]
                let lower = benchmark.category === 'Special' ? startingSpD : startingDef
                let catStat = benchmark.category === 'Special' ? 'spd' : 'def'
                if (benchmark.category === 'Mixed') this.evs.spd = startingSpD

                let benchDef = this.minEVsBinary(benchmark, catStat, maxEVs(), lower)

                if (benchmark.category === 'Mixed') {
                    // if def is maxed, put evs into spd (mixed bench)
                    if (benchDef === -1) {
                        this.evs.def = maxEVs()
                        benchDef = this.minEVsBinary(benchmark, 'spd', maxEVs(), startingSpD)
                        if (benchDef === -1) {
                            return false
                        } else if (benchDef > startingSpD) {
                            startingSpD = benchDef
                            this.evs.spd = startingSpD // update this.evs for the next loop
                        }
                    }
                    // now we have the base evs for the mixed bench
                    // do the lower def + raise spdef strat
                    let ded = false
                    while (!ded) {
                        ded = this.evDownToFail(benchmark, 'def', startingDef)
                        if (ded) {
                            // save to temporary mixed bench storage
                            this.evUp('def')
                            mixedBenchStorage = addMixedBenchToStorage(mixedBenchStorage, this.evs)
                            this.evDown('def')
                        } else {
                            break
                        }
                        ded = !this.evUpToPass(benchmark, 'spd')
                    }
                    this.evs.spd = startingSpD // update this.evs for the next loop
                } else {
                    if (benchDef === -1) {
                        return false
                    } else {
                        if (benchmark.category === 'Special') {
                            if (benchDef > startingSpD) { startingSpD = benchDef }
                        } else {
                            if (benchDef > startingDef) { startingDef = benchDef }
                        }
                    }
                }
            }
        }
        this.evs.def = startingDef
        this.evs.spd = startingSpD
        //starting point acquired
        mixedBenchStorage.length > 0 ? this.output = this.output.concat(mixedBenchStorage) : this.output.push({...this.evs})

        // lower hp + raise defenses
        while (this.evDown('hp')) {
            for (let i = 0; i < sortedBenchmarks.length; i++) {
                let benchmark = sortedBenchmarks[i]
                let ded = benchmark.calculate(this.evs) > benchmark.acceptChance
                if (benchmark.category === 'Mixed' || ded) {
                    let catStat = benchmark.category === 'Special' ? 'spd' : 'def'

                    ded = !this.evUpToPass(benchmark, catStat)

                    if (benchmark.category === 'Mixed') {
                        mixedBenchStorage = [this.evs] // IDK
                        // if def maxed, put evs in spd
                        ded = !this.evUpToPass(benchmark, 'spd', ded)
                        if (ded) return sortSpreads(this.output) // return spreads now, hp cannot be lowered further
                        // dont need to save here, will get saved in next loop
                        while (!ded) {
                            ded = this.evDownToFail(benchmark, 'def', startingDef)
                            if (ded) {
                                // save to temporary mixed bench storage
                                this.evUp('def')
                                mixedBenchStorage = addMixedBenchToStorage(mixedBenchStorage, this.evs)
                                this.evDown('def')
                            } else {
                                break
                            }
                            ded = !this.evUpToPass(benchmark, 'spd')
                        }
                        // save evs here to save time on next loop/mixed bench
                        if (mixedBenchStorage.length > 0) {
                            startingDef = this.evs.def // for mixed benches to know when to stop lowering def
                            this.evs = mixedBenchStorage[0]
                        }
                    } else if (ded) {
                        return sortSpreads(this.output) // return spreads now, hp cannot be lowered further
                    } else {
                        startingDef = this.evs.def // for mixed benches to know when to stop lowering def
                    }
                }
            }
            // save evs here
            mixedBenchStorage.length > 0 ? this.output = this.output.concat(mixedBenchStorage) : this.output.push({...this.evs})
        }
        return sortSpreads(this.output)
    }
}

export const pokeSet = new pSet()

let time = Date.now()

let test = new pSet([], [new Pokemon(gen, 'Pikachu')])
console.log(test)
for (let i = 0; i < 64; i++) {
    test.evUp('hp')
}
for (let i = 0; i < 64; i++) {
    test.evDown('hp')
}

for (let i = 0; i < 64; i++) {
    test.evUp('hp')
}
for (let i = 0; i < 64; i++) {
    test.evDown('hp')
}
time = Date.now() - time
console.log(parseInt((time/(1000*60))%60) + " min " + parseInt((time/1000)%60) + " sec " + parseInt((time%1000)) + " millisec")