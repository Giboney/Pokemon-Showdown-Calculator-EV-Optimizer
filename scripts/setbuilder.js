// the main setbuilding and optimization class framework

import {
    calcStatEVs,
    toggleSelectedAtk,
    combineRolls,
    evInc,
    maxEVs
} from './util.js';

class Attack {
    constructor(
        attacker,
        defender,
        move,
        field,
        draining = false,
        damage = {}
    ) {
        this.attacker = attacker
        this.defender = defender
        this.move = move
        this.field = field
        this.draining = draining
        this.damage = damage
    }

    getDmg() {
        // adjust for draining moves as well
        return calc.calculate(gen, this.attacker, this.defender, this.move, this.field).damage
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
        damage = {},
        acceptChance = 0,
        category = '',
        evs = {}, // used for ko chance and displayed calcs
        jquery = [], // html for list of attacks
        result = ''
    ) {
        this.attacks = attacks
        this.hpmods = hpmods
        this.damage = damage
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

    calculate(evs = {}) {
        let result = ': Calculation Failed'
        let koChance = 0.0
        let hp = this.getHP(evs.hp)
        let rolls = []

        if (evs) {
            this.attacks.forEach((attack) => {
                attack.draining ? attack.attacker.evs = evs : attack.defender.evs = evs
                let rawDmg = attack.getDmg()
                let chance = 1.0 / rawDmg.length // account for crit and acc here as needed
                let dmg = {}
                rawDmg.forEach((roll) => {
                    dmg[roll] = (dmg[roll] || 0) + chance
                })
                rolls.push(dmg)
            })
        } else {
            this.attacks.forEach((attack) => {
                rolls.push(attack.damage)
            })
        }
        this.damage = combineRolls(rolls)

        for (let dmg in this.damage) {
            if (Number(dmg) >= hp) {
                koChance += this.damage[dmg]
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
        output = [] // html for optimized spreads
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

        !b.evs ? b.evs = defender.evs : defender.evs = b.evs
        let result = calc.calculate(gen, attacker, defender, move, field)
        let chance = 1.0 / result.damage.length // account for crit and acc here as needed
        result.damage.forEach((roll) => {
            let dmg = b.attacks.at(-1).damage
            dmg[roll] = (dmg[roll] || 0) + chance
        })

        let desc = result.fullDesc(notation, false)
        desc = desc.replaceAll(
            /([0-9]+)( hp |(\+?-?)( atk | def | spa | spd | spe))|\/ |with an ally's |through |boosted /gi,
            ''
        )
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
        let sortedBenchmarks = []
        this.benchmarks.forEach((benchmark) => {
            // dont add empty benchmarks
            // maybe just account for these so you can have hpmods without status move filler
            if (benchmark.attacks) {
                // sort benchmarks so that mixed benches are last
                benchmark.getCat() === 'Mixed' ? // also updates benchmark.category
                    sortedBenchmarks.push(benchmark) :
                    sortedBenchmarks.unshift(benchmark)
            }
        })
        this.evs = {
            hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0
        }
        let bulklessHP = 0
        sortedBenchmarks.forEach((benchmark) => {
            let upper = maxEVs()
            // dont bother searching thru hp values that are less than what is already required by other benchmarks
            let lower = bulklessHP
            let benchHP = -1
            while (this.evBinary('hp', upper, lower)) {
                // need to recalc because hp changes rolls if you have sitrus
                // can maybe just grab the same rolls and recalc ko chance with new hp instead
                if (benchmark.calculate(this.evs) > benchmark.acceptChance) {
                    lower = this.evs.hp + evInc()
                } else {
                    upper = this.evs.hp - evInc()
                    benchHP = this.evs.hp // save the least required hp evs
                }
            }
            if (benchHP === -1) {
                bulklessHP = maxEVs()
                // break
                // not sure if i should just use a for loop or not
            } else if (benchHP > bulklessHP) {
                bulklessHP = benchHP // if bench requires more hp, save here
            }
        })
        // hp with 0 defense evs acquired
        this.evs.hp = bulklessHP

        let startingDef = 0
        let startingSpD = 0
        if (this.evs.hp === maxEVs()) {
            for (let i = 0; i < sortedBenchmarks.length; i++) {
                let benchmark = sortedBenchmarks[i]
                // thinking i can turn these binary loops into functions, not sure
                let upper = maxEVs()
                let catStat = benchmark.category === 'Special' ? 'spd' : 'def'
                let lower = benchmark.category === 'Special' ? startingSpD : startingDef
                let benchDef = -1
                let benchSpD = -1
                if (benchmark.category === 'Mixed') this.evs.spd = startingSpD

                while(this.evBinary(catStat, upper, lower)) {
                    if (benchmark.calculate(this.evs) > benchmark.acceptChance) {
                        lower = this.evs[catStat] + evInc()
                    } else {
                        upper = this.evs[catStat] - evInc()
                        benchmark.category === 'Special' ? benchSpD = this.evs[catStat] : benchDef = this.evs[catStat]
                    }
                }

                if (benchmark.category === 'Mixed') {
                    // if def is maxed, put evs into spd (mixed bench)
                    if (benchDef === -1) {
                        startingDef = maxEVs()
                        this.evs.def = startingDef
                        upper = maxEVs()
                        lower = startingSpD
                        while(this.evBinary('spd', upper, lower)) {
                            if (benchmark.calculate(this.evs) > benchmark.acceptChance) {
                                lower = this.evs['spd'] + evInc()
                            } else {
                                upper = this.evs['spd'] - evInc()
                                benchSpD = this.evs['spd']
                            }
                        }
                        if (benchSpD === -1) {
                            console.log('fail')
                            return false
                        } else {
                            if (benchSpD > startingSpD) {
                                startingSpD = benchSpD
                                this.evs.spd = startingSpD // update this.evs for the next loop
                            }
                        }
                    }
                    // now we have the base evs for the mixed bench
                    // do the lower def + raise spdef strat
                    let ded = false
                    while (this.evDown('def') && !ded) {
                        ded = benchmark.calculate(this.evs) > benchmark.acceptChance
                        while (!ded) {
                            if (!this.evDown('def')) break
                            ded = benchmark.calculate(this.evs) > benchmark.acceptChance
                        }
                        while (ded) {
                            if (!this.evUp('spd')) break
                            ded = benchmark.calculate(this.evs) > benchmark.acceptChance
                        }
                        if (!ded) {
                            console.log(this.evs)
                        }
                    }
                } else {
                    if (benchmark.category === 'Special' ? benchSpD === -1 : benchDef === -1) {
                        console.log('fail')
                        return false
                    } else {
                        if (benchmark.category === 'Special') {
                            if (benchSpD > startingSpD) { startingSpD = benchSpD }
                        } else {
                            if (benchDef > startingDef) { startingDef = benchDef }
                        }
                    }
                }
            }
        }
        this.evs.def = startingDef
        this.evs.spd = startingSpD
        console.log(this.evs)
        // save these evs and any evs with greater hp if possible
        //starting point acquired

        // lower hp + raise defenses
        while (this.evDown('hp')) {
            // need to recalc mixed benches for each hp value i think
            while (sortedBenchmarks.every((benchmark) => {
                return benchmark.calculate(this.evs) <= benchmark.acceptChance
            })) {
                console.log(this.evs)
                if (!this.evDown('hp')) break
            }

            for (let i = 0; i < sortedBenchmarks.length; i++) {
                let benchmark = sortedBenchmarks[i]
                let catStat = benchmark.category === 'Special' ? 'spd' : 'def'
                let ded = benchmark.calculate(this.evs) > benchmark.acceptChance
                if (benchmark.category === 'Mixed') startingDef = this.evs.def // repurposing this variable idc
                while (ded) {
                    if (!this.evUp(catStat)) break
                    ded = benchmark.calculate(this.evs) > benchmark.acceptChance
                }

                if (benchmark.category === 'Mixed') {
                    // def maxed, put evs in spd
                    while (ded) {
                        if (!this.evUp('spd')) break
                        ded = benchmark.calculate(this.evs) > benchmark.acceptChance
                    }
                    if (!ded) {
                        console.log(this.evs) // save to mixed bench storage
                    } else {
                        return true // return spreads now, hp cannot be lowered further
                    }
                    // will need to check against previous mixed benches to see min spd for each def value
                    while (this.evDown('def') && this.evs.def >= startingDef && !ded) {
                        ded = benchmark.calculate(this.evs) > benchmark.acceptChance
                        while (!ded) {
                            if (!this.evDown('def') || this.evs.def < startingDef) break
                            ded = benchmark.calculate(this.evs) > benchmark.acceptChance
                        }
                        while (ded) {
                            if (!this.evUp('spd')) break
                            ded = benchmark.calculate(this.evs) > benchmark.acceptChance
                        }
                        if (!ded) {
                            console.log(this.evs) // save to mixed bench database
                        }
                    }
                } else if (ded) {
                    console.log('end')
                    return true // return spreads now, hp cannot be lowered further
                }
            }
            console.log(this.evs) // save evs here, will be more complex bc of mixed benches
        }
        console.log(this)
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