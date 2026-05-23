let time = Date.now()

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
        html = ''
    ) {
        this.attacks = attacks
        this.hpmods = hpmods
        this.damage = damage
        this.html = html
    }
}

class pSet {
    constructor(
        pokemon, //ps calc Pokemon class
        benchmarks = []
    ) {
        this.pokemon = pokemon
        this.benchmarks = benchmarks
    }

    evUp(statID) {
        let max = gen == 0 ? 32 : 252
        if (this.pokemon.evs[statID] >= max) return false
        let inc = gen == 0 ? 1 : 4
        // if not divisible by 4
        if (gen != 0) this.pokemon.evs[statID] = this.pokemon.evs[statID] - (this.pokemon.evs[statID] % 4)
        let oldStat = this.pokemon.calcStat(GENERATION, statID)
        while (this.pokemon.evs[statID] < max && this.pokemon.calcStat(GENERATION, statID) == oldStat) {
            this.pokemon.evs[statID] += inc
        }
        return this.pokemon.calcStat(GENERATION, statID) != oldStat
    }

    evDown(statID) {
        if (this.pokemon.evs[statID] <= 0) return false
        let inc = gen == 0 ? 1 : 4
        // if not divisible by 4
        if (gen != 0) this.pokemon.evs[statID] = this.pokemon.evs[statID] - (this.pokemon.evs[statID] % 4)
        let oldStat = this.pokemon.calcStat(GENERATION, statID)
        while (this.pokemon.evs[statID] > 0 && this.pokemon.calcStat(GENERATION, statID) == oldStat) {
            this.pokemon.evs[statID] -= inc
        }
        return this.pokemon.calcStat(GENERATION, statID) != oldStat
    }
}

time = Date.now() - time
console.log(parseInt((time/(1000*60))%60) + " min " + parseInt((time/1000)%60) + " sec " + parseInt((time%1000)) + " millisec")
time = Date.now()

test = new pSet(new Pokemon(gen, 'Pikachu'))
console.log(test)
for (let i = 0; i < 64; i++) {
    console.log(test.evUp('hp'))
}
for (let i = 0; i < 64; i++) {
    console.log(test.evDown('hp'))
}

time = Date.now() - time
console.log(parseInt((time/(1000*60))%60) + " min " + parseInt((time/1000)%60) + " sec " + parseInt((time%1000)) + " millisec")