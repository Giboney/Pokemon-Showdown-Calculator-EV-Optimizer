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

    fail(evs = this.evs) {
        return this.calculate(evs) > this.acceptChance
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
    }

    evDown(statID) {
        let evs = this.evs[statID]
        if (evs <= 0) return false
        if (gen != 0) evs = evs - (evs % 4) // if not divisible by 4
        let oldStats = this.forms.flatMap((form) => calcStatEVs(form, statID, evs))
        let statChanged = false
        // down until stat changes
        while (evs > 0 && !statChanged) {
            evs -= evInc()
            statChanged = oldStats.some((stat, i) => {
                return stat != calcStatEVs(this.forms[i], statID, evs)
            })
        }
        // down until stat changes again to get min evs
        statChanged = false
        while (evs > 0 && !statChanged) {
            evs -= evInc()
            statChanged = oldStats.some((stat, i) => {
                return stat != calcStatEVs(this.forms[i], statID, evs)
            })
        }
        // if stat changes again, go up one to get correct evs
        if (statChanged) evs += evInc()
        if (evs != this.evs[statID]) this.evs[statID] = evs
        return statChanged
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
            if (bench.fail(this.evs)) {
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
            ded = bench.fail(this.evs)
        }
        return !ded
    }

    // returns true if successfully lowered evs until failure. returns false if pokemon still survives with min evs
    evDownToFail(benchmarks, stat, min, ded = false) {
        while (!ded) {
            if (!this.evDown(stat)) { break }
            if (this.evs[stat] < min) {
                this.evUp(stat)
                break
            }
            ded = benchmarks.some((bench) => { return bench.fail(this.evs) })
        }
        return ded
    }

    getSpreads() {
        // calculate with 0 def evs first
        this.output = []
        let simpleBenchmarks = []
        let mixedBenchmarks = [] // calculate mixed benchmarks separately
        this.benchmarks.forEach((benchmark) => {
            // dont add empty benchmarks
            // maybe just account for these so you can have hpmods without status move filler
            // just going to add the option to filter the output based on hp patterns (divisible by 4 etc)
            if (benchmark.attacks.length > 0) {
                if (benchmark.getCat() === 'Mixed') { // getCat also updates benchmark.category
                    mixedBenchmarks.push(benchmark)
                } else {
                    simpleBenchmarks.push(benchmark)
                }
            }
        })
        this.evs = {
            hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0
        }
        // get starting hp value
        let bulklessHP = 0
        for (let i = 0; i < simpleBenchmarks.length && bulklessHP > -1; i++) {
            let benchHP = this.minEVsBinary(simpleBenchmarks[i], 'hp', maxEVs(), bulklessHP)
            if (benchHP === -1 || benchHP > bulklessHP) {
                bulklessHP = benchHP
            }
        }
        for (let i = 0; i < mixedBenchmarks.length && bulklessHP > -1; i++) {
            let benchHP = this.minEVsBinary(mixedBenchmarks[i], 'hp', maxEVs(), bulklessHP)
            if (benchHP === -1 || benchHP > bulklessHP) {
                bulklessHP = benchHP
            }
        }
        this.evs.hp = bulklessHP

        let startingDef = 0
        let startingSpD = 0
        let mixedBenchStorage = []
        let mixedStartingDef = 0
        // add defense if needed
        if (this.evs.hp === -1) {
            this.evs.hp = maxEVs()
            for (let i = 0; i < simpleBenchmarks.length; i++) {
                let benchmark = simpleBenchmarks[i]
                let lower = benchmark.category === 'Special' ? startingSpD : startingDef
                let catStat = benchmark.category === 'Special' ? 'spd' : 'def'

                let benchDef = this.minEVsBinary(benchmark, catStat, maxEVs(), lower)

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

            if (mixedBenchmarks.length > 0) {
                // get starting point for mixed benches
                mixedStartingDef = startingDef
                for (let i = 0; i < mixedBenchmarks.length; i++) {
                    let benchmark = mixedBenchmarks[i]
                    this.evs.spd = startingSpD
                    let benchDef = -1

                    // dont run calcs if def is already maxed
                    if (mixedStartingDef < maxEVs()) {
                        benchDef = this.minEVsBinary(benchmark, 'def', maxEVs(), mixedStartingDef)
                        if (benchDef > mixedStartingDef) {
                            mixedStartingDef = benchDef
                        } else if (benchDef === -1) {
                            mixedStartingDef = maxEVs()
                        }
                    }

                    // if def is maxed, put evs into spd (mixed bench)
                    if (benchDef === -1) {
                        this.evs.def = maxEVs()
                        benchDef = this.minEVsBinary(benchmark, 'spd', maxEVs(), startingSpD)
                        if (benchDef === -1) {
                            return false
                        } else if (benchDef > startingSpD) {
                            startingSpD = benchDef
                        }
                    }
                }
                
                let ded = false
                this.evs.def = mixedStartingDef
                this.evs.spd = startingSpD
                while (!ded) {
                    ded = this.evDownToFail(mixedBenchmarks, 'def', startingDef)

                    if (ded) {
                        this.evUp('def')
                        mixedStartingDef = this.evs.def
                        mixedBenchStorage = addMixedBenchToStorage(mixedBenchStorage, this.evs)
                        this.evDown('def')
                    } else {
                        mixedStartingDef = this.evs.def
                        break
                    }

                    for (let i = 0; i < mixedBenchmarks.length; i++) {
                        ded = !this.evUpToPass(mixedBenchmarks[i], 'spd')
                        if (ded) break
                    }
                }
                if (mixedStartingDef > startingDef) startingDef = mixedStartingDef
            }
        }
        this.evs.def = startingDef
        this.evs.spd = startingSpD
        // starting point acquired
        // save evs
        if (mixedBenchStorage.length > 0) {
            mixedBenchStorage.forEach((spread) => { this.output.push({...spread}) })
        } else {
            this.output.push({...this.evs})
        }

        // lower hp + raise defenses
        while (this.evDown('hp')) {
            for (let i = 0; i < simpleBenchmarks.length; i++) {
                let benchmark = simpleBenchmarks[i]

                if (benchmark.fail(this.evs)) {
                    let catStat = benchmark.category === 'Special' ? 'spd' : 'def'
                    if (!this.evUpToPass(benchmark, catStat)) {
                        return sortSpreads(this.output)
                    }
                }
            }

            if (mixedBenchmarks.length > 0 &&
                // only recalc mixed benches if there is a failing spread
                mixedBenchStorage.some((spread) => {
                    return mixedBenchmarks.some((bench) => {
                        spread.hp = this.evs.hp
                        return bench.fail(spread)
                    })
                })
            ) {
                // get starting point for mixed bench
                startingDef = this.evs.def // save starting def here before it gets overwritten
                for (let i = 0; i < mixedBenchmarks.length; i++) {
                    let benchmark = mixedBenchmarks[i]
                    if (benchmark.fail(this.evs)) {
                        if (!this.evUpToPass(benchmark, 'def')) {
                            if (!this.evUpToPass(benchmark, 'spd')) {
                                return sortSpreads(this.output)
                            }
                        }
                    }
                }
                
                // lower def + raise spd
                startingSpD = this.evs.spd
                mixedBenchStorage = []
                let ded = false
                while (!ded) {
                    ded = this.evDownToFail(mixedBenchmarks, 'def', startingDef)

                    if (ded) {
                        this.evUp('def')
                        mixedStartingDef = this.evs.def
                        mixedBenchStorage = addMixedBenchToStorage(mixedBenchStorage, this.evs)
                        this.evDown('def')
                    } else {
                        mixedStartingDef = this.evs.def
                        break
                    }

                    for (let i = 0; i < mixedBenchmarks.length; i++) {
                        ded = !this.evUpToPass(mixedBenchmarks[i], 'spd')
                        if (ded) break
                    }
                }
                if (mixedStartingDef > startingDef) startingDef = mixedStartingDef
                this.evs.def = startingDef
                this.evs.spd = startingSpD
            }
            
            // save evs
            if (mixedBenchStorage.length > 0) {
                mixedBenchStorage.forEach((spread) => { this.output.push({...spread}) })
            } else {
                this.output.push({...this.evs})
            }
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