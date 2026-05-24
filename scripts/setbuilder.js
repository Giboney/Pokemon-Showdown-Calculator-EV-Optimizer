// the main setbuilding and optimization class framework

import { calcStatEVs } from './util.js';

export class Attack {
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

export class HPMods {
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

export class Benchmark {
    constructor(
        attacks = [], 
        hpmods = new HPMods,
        damage = {},
        evs = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0},
        html = ''
    ) {
        this.attacks = attacks
        this.hpmods = hpmods
        this.damage = damage
        this.evs = evs
        this.html = html
    }
}

export class pSet {
    constructor(
        benchmarks = [],
        forms = [], //store all forms here ie Megas, Aegislash
        evs = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0},
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
        if (!statChanged) {
            return false
        } else {
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
        if (!statChanged) {
            return false
        } else {
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
    }
}


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