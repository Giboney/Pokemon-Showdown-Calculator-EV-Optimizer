// ui functions, mostly jQuery stuff

import {
    capitalize
} from './util.js';

//Pokémon 1

// fixing dark theme issues
function updateMyTheme() {
	var isDark = prefersDarkTheme ?
        prefersDarkTheme === 'true' :
        window.matchMedia('(prefers-color-scheme: dark)').matches
	var darkStyles = document.getElementById('darkStyles')
	darkStyles.disabled = !isDark
}

// making the buttons to collapse unnecessary info
function collapseBtn(name, position = '', side = '') {
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

function getCollapseTarget(id) {
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

function createCollapsePanels() {
    let collapsePanelL = $('<div>', {id: 'collapsePanelL', class: 'collapse-panel collapse-left'})
    let collapsePanelR = $('<div>', {id: 'collapsePanelR', class: 'collapse-panel collapse-right'})
    collapsePanelL.append(
        collapseBtn('Type', 'top', 'left').concat(
            collapseBtn('Stats', 'mid', 'left'),
            collapseBtn('Item', 'mid', 'left'),
            collapseBtn('Health', 'mid', 'left'),
            collapseBtn('Moves', 'btm', 'left')
        )
    )
    collapsePanelR.append(
        collapseBtn('Type', 'top', 'right').concat(
            collapseBtn('Stats', 'mid', 'right'),
            collapseBtn('Item', 'mid', 'right'),
            collapseBtn('Health', 'mid', 'right'),
            collapseBtn('Moves', 'btm', 'right')
        )
    )
    $('#p1').prepend(collapsePanelL)
    $('#p2').prepend(collapsePanelR)

    $('.collapse-checkbox').on('change', function() {
        let target = getCollapseTarget($(this)[0].id)
        if (target) target.toggleClass('hide', $(this).prop('checked'))

    })
}

function createFieldCollapseBtn() {
    $('div:has(> #magicRoomInstruction)').css('display', '')
    $('.field-info').append(collapseBtn('field'))
    $('#fieldCollapse').on('change', function() {
        $([
            'div:has(> #harsh-sunshine)',
            'div:has(> #magicRoomInstruction)',
            'div:has(> #gravityInstruction)',
            'tr:has(#selectRevealInstruction)',
            'tr:has(#selectFlowerGiftInstruction)',
            'tr:has(#selectPowerTrickInstruction)',
            'tr:has(#selectSteelySpiritInstruction)',
            'tr:has(#selectBatteryInstruction)',
            'tr:has(#selectPowerSpotInstruction)',
            'tr:has(#selectSwitchingInstruction)'
        ].join(', ')).toggleClass('hide', $(this).prop('checked'))
    })
}


// main
updateMyTheme()
$('#dark-theme-toggle').on('change', updateMyTheme)
createCollapsePanels()
createFieldCollapseBtn()
// fix buttons for opera
$('[id=clearSets]').removeClass('btn-4xwide')
$('[id=clearSets]').addClass('btn-4xwide')
$('button').addClass('btn')