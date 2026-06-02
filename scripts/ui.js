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
    $('#p1').append(collapsePanelL)
    $('#p2').append(collapsePanelR)

    $('.collapse-checkbox').on('change', function() {
        let target = getCollapseTarget($(this)[0].id)
        if (target) target.toggleClass('hide', $(this).prop('checked'))

    })
}

// breaks when gen is switched to rby
// use element style display none instead of class
// use jquery .hide()
//be careful tho it might unhide stuff in other gens
// need to change position depending on gen
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

function benchTabBtn(name, position) {
    position = position.toLowerCase()
    let id = `benchTab${$('#benchTbas > input').length}`
    return [
        $('<input>', {
            id: id,
            class: 'bench-tab visually-hidden',
            type: 'radio',
            name: 'resultMove'
        }),
        $('<label>', {
            class: 'btn btn-' + position,
            for: id,
            text: name,
            title: 'Right click for options.'
        })
    ]
}

function doPanels() {
    // create optimizer panel
    let optimizerPanel = $('<fieldset>', {id: 'optimizerPanel'})
    optimizerPanel.append($('<legend>', {text: 'Optimizer'}))
    $('.main-result-group').after(optimizerPanel)
    // fixing base calc panel positioning (it was off before)
    // calcPanels div is display flex
    let calcPanelsDiv = $('<div>', {id: 'calcPanels'})
    optimizerPanel.after(calcPanelsDiv)
    $('.panel').appendTo(calcPanelsDiv)
}

function fixCalculationResults() {
    $(".result-move").off('change')
    // adjusted so that each hit has a newline, and parenthesis are included
    displayDamageHits = function(damage) {
        // Fixed Damage
        if (typeof damage === 'number') return "(" + damage.toString() + ")";
        // Standard Damage
        if (damage.length > 2 && typeof damage[0] === 'number')
            return "(" + damage.join(', ') + ")";
        // Fixed Parental Bond Damage
        if (typeof damage[0] === 'number' && typeof damage[1] === 'number') {
            return '1st Hit: (' + damage[0] + ')\n2nd Hit: (' + damage[1] + ")";
        }
        // Multihit Damage
        var fullText = "";
        for (var i = 1; i <= damage.length; i++) {
            var txt = toOrdinal(i) + " Hit: (" + damage[i - 1].join(', ') + ")";
            if (i < damage.length) txt += "\n";
            fullText += txt;
            // if (i % 2 == 1 && i < damage.length) fullText += "\n";
        }
        return fullText;
    }
    $(".result-move").on('change', function () {
        if (damageResults) {
            var result = findDamageResult($(this));
            if (result) {
                var desc = result.fullDesc(notation, false);
                if (desc.indexOf('--') === -1) desc += ' -- possibly the worst move ever';
                $("#mainResult").text(desc);
                var summary = displayDamageHits(result.damage);
                var rest = "";
                var newLine = summary.indexOf('\n');
                if (newLine > -1) {
                    rest = summary.substring(newLine + 1);
                    summary = summary.substring(0, newLine);
                }
                $("#firstDmgValues").text("Possible damage amounts: " + summary);
                if (rest !== "") $("#restDmgValues").text(rest);

                if (rest.trim() === "") {
                    $("#firstDmgValues").css("display", "block");
                    $("#restDmgValues").text("");
                } else {
                    $("#damageValues").removeAttr("open");
                    $("#firstDmgValues").css("display", "revert");
                }
            }
        }
    });
    // fix/add copyable result/rolls
    let rolls = $('#damageValues')
    let rollsTooltip = $('<div>', {id: 'rollsTooltip', style: 'visibility: hidden', text: 'Copied'})
    rolls.attr('title', 'Right-click to copy.')
    rolls.after(rollsTooltip)
    rolls.on('contextmenu', function() { return false })
    rolls.on('mousedown', function(e) {
        if (e.button === 2) {
            rolls.one('mouseup', function() {
                if (e.button === 2) {
                    let text = $('#firstDmgValues').text() + '\n' + $('#restDmgValues').text()
                    navigator.clipboard.writeText(text).then(function () {
                        $('#rollsTooltip').css('visibility', 'visible')
                        setTimeout(function () {
                            $('#rollsTooltip').css('visibility', 'hidden')
                        }, 1500);
                    })
                }
            })
        }
    })
}

function createBenchBrowser() {
    //create bench window
    let benchDiv = $('<div>', {id: 'benchBrowser'}) // add id later if needed
    let benchTabs = $('<div>', {id: 'benchTabs'})
    let benchWindow = $('<div>', {id: 'benchWindow'})
    benchDiv.append([benchTabs, benchWindow])
    $('.move-result-subgroup:has(#resultHeaderL)').after(benchDiv)
    //move % damage to left side for p1
    for (let i = 1; i <= 4; i++) {
        $(`#resultDamageL${i}`).prependTo($(`#resultDamageL${i}`).parent())
    }

    benchTabs.append(benchTabBtn('Benchmark 1', 'top'))

    //add tab context menu
    let benchTabOptions = $('<div>', {id: 'benchTabOptions', style: 'display: none'})
    benchTabOptions.append([
        $('<span>', {id: 'benchRename', text: 'Rename'}),
        $('<span>', {id: 'benchDelete', text: 'Delete'})
    ])
    $('body').prepend(benchTabOptions)

    benchTabs.on('contextmenu', '.bench-tab + .btn', function(e) {
        e.preventDefault()
        if (benchTabOptions.is(':hidden')) {
            benchTabOptions.css({'left': e.pageX, 'top': e.pageY, 'display': 'flex'})
        } else {
            benchTabOptions.hide()
        }
    })

    // clear context menu when clicking elsewhere
    $(document).on('click', function() {
        benchTabOptions.hide()
    })
}



// main

// do optimizer ui stuff
updateMyTheme()
$('#dark-theme-toggle').on('change', updateMyTheme)
createCollapsePanels()
createFieldCollapseBtn()
doPanels()
fixCalculationResults()
createBenchBrowser()
// fix buttons for opera
$('[id=clearSets]').removeClass('btn-4xwide')
$('[id=clearSets]').addClass('btn-4xwide')
$('button').addClass('btn')

console.log('done')