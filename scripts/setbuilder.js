// the main setbuilding and optimization class framework

import {
    calcStatEVs,
    toggleSelectedAtk,
    combineRolls
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
        evs = {}, // used for ko chance and displayed calcs
        jquery = [], // html for list of attacks
        result = ''
    ) {
        this.attacks = attacks
        this.hpmods = hpmods
        this.damage = damage
        this.evs = evs
        this.jquery = jquery
        this.result = result
    }

    getHP(evs) {
        let attack = this.attacks.at(-1)
        let defender = attack.draining ? attack.attacker : attack.defender
        let hp = calcStatEVs(defender, 'hp', evs.hp)
        // apply hpmods here
        return hp
    }

    //not sure if i will use this
    updateEVs(evs = {}) {
        if (evs) this.evs = evs
        this.attacks.forEach((attack) => {
            attack.draining ? attack.attacker.evs = this.evs : attack.defender.evs = this.evs
        })
    }

    calculate(evs = {}) {
        let result = 'Calculation Failed'
        let koChance = 0.0
        let hp = this.getHP(evs)
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
        let total = 0

        for (let dmg in this.damage) {
            if (Number(dmg) >= hp) {
                koChance += this.damage[dmg]
            }
            total += this.damage[dmg]
        }
        console.log(total)

        koChance *= 100
        this.result = `: ${(Math.round(koChance * 1000) / 1000).toFixed(3)}% chance to KO` // add dmg range here too
        return koChance 
    }
}

class pSet {
    constructor(
        benchmarks = [],
        forms = [], // store all forms here ie Megas, Aegislash
        evs = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}, // used for optimized ev spread
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
        let max = gen == 0 ? 32 : 252
        let evs = this.evs[statID]
        if (evs >= max) return false
        let inc = gen == 0 ? 1 : 4
        if (gen != 0) evs = evs - (evs % 4) // if not divisible by 4
        let oldStats = this.forms.flatMap((form) => calcStatEVs(form, statID, evs))
        let statChanged = false
        while (evs < max && !statChanged) {
            evs += inc
            statChanged = oldStats.some((stat, i) => {
                return stat != calcStatEVs(this.forms[i], statID, evs)
            })
        }
        if (evs != this.evs[statID]) this.evs[statID] = evs
        if (!statChanged) return false
        // update benchmarks with new evs
        this.benchmarks.forEach((benchmark) => {
            benchmark.attacks.forEach((attack) => {
                attack.draining ?
                    attack.attacker.evs[statID] = evs :
                    attack.defender.evs[statID] = evs
            })
        })
        return true
    }

    evDown(statID) {
        let evs = this.evs[statID]
        if (evs <= 0) return false
        let inc = gen == 0 ? 1 : 4
        if (gen != 0) evs = evs - (evs % 4) // if not divisible by 4
        let oldStats = this.forms.flatMap((form) => calcStatEVs(form, statID, evs))
        let statChanged = false
        while (evs > 0 && !statChanged) {
            evs -= inc
            statChanged = oldStats.some((stat, i) => {
                return stat != calcStatEVs(this.forms[i], statID, evs)
            })
        }
        if (evs != this.evs[statID]) this.evs[statID] = evs
        if (!statChanged) return false
        // update benchmarks with new evs
        this.benchmarks.forEach((benchmark) => {
            benchmark.attacks.forEach((attack) => {
                attack.draining ?
                    attack.attacker.evs[statID] = evs :
                    attack.defender.evs[statID] = evs
            })
        })
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
        // this.forms.push(defender)

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
        console.log(this)
    }

    getSpreads() {
        let mixedBenches = [] //
        this.benchmarks.forEach((benchmark) => {
            benchmark.calculate(this.evs)
            // hp with 0 defense evs
            // if max hp binary search defense evs (different with mixed benches)
            // this is out starting point ev spread
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
        })
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