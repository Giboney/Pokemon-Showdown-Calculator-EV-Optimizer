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

export function capitalize(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

// making the buttons to collapse unnecessary info
export function collapseBtn(name, position = '', side = '') {
    name = name.toLowerCase()
    position = position.toLowerCase()
    side = side.toLowerCase()
    let sideLetter = !!side ? side.charAt(0).toUpperCase() : ''
    let btnClass = !!position ? ` btn-${position + (position == 'mid' ? '' : `-${side}`)}` : ''

    return [$('<input>', {
        id: name + 'Collapse' + sideLetter,
        class: `collapse-checkbox visually-hidden`,
        type: 'checkbox'
    }),
    $('<label>', {
        class: 'btn' + btnClass + ' collapse-btn',
        for: name + 'Collapse' + sideLetter,
        text: capitalize(name)
    })]
}

export function getCollapseTarget(id) {
    switch (id.slice(0,-9)) {
        case 'type':
            return $(`#${id}`).parent().siblings().has('.type1')
        case 'stats':
            return $(`#${id}`).parent().siblings().has('table')
        case 'item':
            return $(`#${id}`).parent().siblings().has('.nature')
        case 'health':
            return $(`#${id}`).parent().siblings().has('.current-hp')
        case 'moves':
            return $(`#${id}`).parent().siblings().has('.move-bp')

        default:
            return false
    }
}

export function benchTabBtn(name, position) {
    position = position.toLowerCase()
    let id = `benchTab${$('#benchTabs > input').length + 1}`
    return [
        $('<input>', {
            id: id,
            class: 'bench-tab visually-hidden',
            type: 'radio',
            name: 'benchTabs'
        }),
        $('<label>', {
            class: 'btn btn-' + position,
            for: id,
            text: name,
            title: 'Right-click for options.'
        })
    ]
}