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
    let id = `benchTab${$('.bench-tab').length + 1}`
    if ($(`#${id}`).length) {
        let dupe = 1
        while ($(`#${id}-${dupe}`).length) {
            dupe++
        }
        id += `-${dupe}`
    }
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
    let right = e.button === 2
    let selected = element.hasClass('selected-atk')

    if (right && !selected && !ctrl && !shift) {
        $('.selected-atk').removeClass('selected-atk')
        $('.last-selected-atk').removeClass('last-selected-atk')
        element.addClass('last-selected-atk')
        element.addClass('selected-atk')
    } else if (!right) {
        if (!ctrl) $('.selected-atk').removeClass('selected-atk')
        if (shift) {
            let start = $('.last-selected-atk').index()
            let end = element.index()
            let atks = $('.bench-atk')
            if (start > end) [start, end] = [end, start]
            for (let i = start; i <= end; i++) {
                atks.eq(i).addClass('selected-atk')
            }
        } else if (ctrl) {
            element.toggleClass('selected-atk')
        } else {
            element.addClass('selected-atk')
        }
        if (!shift) {
            $('.last-selected-atk').removeClass('last-selected-atk')
            element.addClass('last-selected-atk')
        }
    }
}

// might move this elsewhere because i need to account for sitrus and stuff
// or just split into 2 sets at a time idk
// maybe i can just run an event trigger check on each loop
// rename function to something like getKOChance
export function combineRolls(atks) {
    if (atks.length > 1) {
        let combined = {}
        for (let dmgA in atks[0]) {
            for (let dmgB in atks[1]) {
                let dmg = Number(dmgA) + Number(dmgB)
                let chance = atks[0][dmgA] * atks[1][dmgB]
                combined[dmg] = (combined[dmg] || 0) + chance
            }
        }
        atks[0] = combined
        atks.splice(1,1)
        return combineRolls(atks)
    } else {
        return atks[0]
    }
}

export function maxEVs() {
    return gen == 0 ? 32 : 252
}

export function evInc() {
    return gen == 0 ? 1 : 4
}

export function maxTotalEVs() {
    return gen == 0 ? 66 : 508
}

export function isEmptyObj(obj) {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
}

export function sumValues(obj) {
    return Object.values(obj).reduce((a, b) => a + b)
}

export function addMixedBenchToStorage(storage, evs) {
    let add = true
    let replace = true
    storage.forEach((spread) => {
        add = add && sumValues(spread) === sumValues(evs)
        replace = replace && sumValues(spread) > sumValues(evs)
    })
    if (add) {
        storage.push({...evs})
    } else if (replace) {
        storage = [{...evs}]
    }
    return storage
}

export function sortSpreads(spreads) {
    spreads = spreads.filter((evs) => {
        evs.total = sumValues(evs)
        return evs.total <= maxTotalEVs()
    })

    return spreads.sort((a, b) => {
        return (a.total * 10 + a.hp) - (b.total * 10 + a.hp)
    })
}