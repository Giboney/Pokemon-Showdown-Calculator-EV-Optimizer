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

export function toggleSelectedAtk(e) {
    e.preventDefault()
    let element = $(e.target)
    let ctrl = e.ctrlKey
    let shift = e.shiftKey
    let right = e.type == 'contextmenu'
    console.log(e)
    console.log(element)
    if (!element.hasClass('.selected-atk')) {
        if (!ctrl) $('.selected-atk').removeClass('selected-atk')
        if (shift && !right) {
            let start = $('.last-selected-atk').index()
            let end = element.index()
            let atks = $('.bench-atk')
            if (start > end) [start, end] = [end, start]
            for (let i = start; i <= end; i++) {
                atks.eq(i).addClass('selected-atk')
            }
        } else {
            element.addClass('selected-atk')
        }
        $('.last-selected-atk').removeClass('last-selected-atk')
        element.addClass('last-selected-atk')
    
        // if ctrl is held, do not clear selected, else clear selected and reapply
        // use last-selected to deteremine which atks to highlight
        // need to clear these classes on bench change
        // need to clear when clicking outside the window or just not on an atk
    } else if (ctrl) {
        element.removeClass('selected-atk')
    }
}