// the main setbuilding and optimization class framework

import {
    calcStatEVs,
    toggleSelectedAtk
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
        jquery = []
    ) {
        this.attacks = attacks
        this.hpmods = hpmods
        this.damage = damage
        this.evs = evs
        this.jquery = jquery
    }
}

class pSet {
    constructor(
        benchmarks = [],
        forms = [], // store all forms here ie Megas, Aegislash
        evs = {}, // used for optimized ev spread
        nature = ''
    ) {
        this.benchmarks = benchmarks
        this.forms = forms,
        this.evs = evs,
        this.nature = nature
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

        !b.evs ? b.evs = defender.evs : defender.evs = b.evs
        let result = calc.calculate(gen, attacker, defender, move, field)
        let chance = 1.0 / result.damage.length // account for crit and acc here as needed
        result.damage.forEach((roll) => {
            b.attacks.at(-1).damage[roll] = chance
        })

        let desc = result.fullDesc(notation, false)
        desc = desc.replaceAll(
            /([0-9]+)( hp |(\+?-?)( atk | def | spa | spd | spe))|\/ |with an ally's |through |boosted /gi,
            ''
        )
        desc = desc.slice(0,desc.indexOf(':') + 2) + result.moveDesc(notation)
        let element = $('<li>', {class: 'bench-atk', text: desc})
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