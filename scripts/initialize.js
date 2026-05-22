class Attack {
    constructor(attacker, defender, move, field, draining = false, damage = []) {
        this.attacker = attacker
        this.defender = defender
        this.move = move
        this.field = field
        this.draining = draining
        this.damage = damage
    }
}

class HPMods {
    constructor(healing = {}, damage = {}, item = '', sub = false, other = 0) {
        this.healing = healing
        this.damage = damage
        this.item = item
        this.sub = sub
        this.other = other
    }
}

class Benchmark {
    constructor(attacks, hpmods, damage = [], html = '') {
        this.attacks = attacks
        this.hpmods = hpmods
        this.damage = damage
        this.html = html
    }
}

class pSet {
    constructor(benchmarks, nature = '', evs = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}) {
        this.benchmarks = benchmarks
        this.nature = nature
        this.evs = evs
    }
}