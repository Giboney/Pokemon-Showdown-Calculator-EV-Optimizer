// utility functions that dont belong to any class


export function calcStatEVs(pokemon, statID, evs) {
    return calc.calcStat(
        GENERATION,
        statID,
        pokemon.species.baseStats[statID],
        pokemon.ivs[statID],
        evs,
        pokemon.level,
        pokemon.nature
    )
}