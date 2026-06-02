// ui functions, mostly jQuery stuff

import {
    capitalize,
    collapseBtn,
    benchTabBtn
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

// requires #addBenchBtn to exist
export function addBenchTab() {
    let num = $('#benchTabs > input').length + 1
    let name = 'Benchmark ' + num
    let position = 'top-right'
    if (num == 1) {
        position = 'top'
    } else if (num == 2) {
        $('#benchTabs > .btn-top').removeClass('btn-top').addClass('btn-top-left')
    } else if (num > 2) {
        $('#benchTabs > .btn-top-right').removeClass('btn-top-right').addClass('btn-mid')
    }
    let tab = benchTabBtn(name, position)
    tab[0].prop('checked', true)
    $('#addBenchBtn').before(tab)
}

// requires addBenchTab
export function removeBenchTab() {
    let index = $('.bench-tab').index($('.bench-tab:checked'))
    $('.bench-tab:checked, .bench-tab:checked + .btn').remove()
    let length = $('.bench-tab').length
    let tab = $('.bench-tab + .btn').eq(index)
    console.log(tab)
    //also clear benchmark data and shit
    if (length == 0) {
        addBenchTab()
    } else if (index == 0) {
        length > 1 ?
            tab.removeClass('btn-mid').addClass('btn-top-left') :
            tab.removeClass('btn-top-right').addClass('btn-top')
    } else if (index == length) {
        tab = $('.bench-tab + .btn').last()
        length > 1 ?
            tab.removeClass('btn-mid').addClass('btn-top-right') :
            tab.removeClass('btn-top-left').addClass('btn-top')
    }
    tab.prev().prop('checked', true)
}

function createBenchBrowser() {
    //create bench window
    let benchDiv = $('<div>', {id: 'benchBrowser'})
    let benchTabs = $('<div>', {id: 'benchTabs'})
    let benchWindow = $('<div>', {id: 'benchWindow'})
    benchDiv.append([benchTabs, benchWindow])
    $('.move-result-subgroup:has(#resultHeaderL)').after(benchDiv)
    for (let i = 1; i <= 4; i++) { // move % damage to left side for p1
        $(`#resultDamageL${i}`).prependTo($(`#resultDamageL${i}`).parent())
    }
    // add attack buttons
    $('.move-result-subgroup:has(#resultHeaderL) .result-move').parent().append(
        $('<div>', {class: 'add-atk', title: 'Add this attack to the benchmark.'}).append($('<div>', {class: 'plus'}))
    )
    $('.move-result-subgroup:has(#resultHeaderR) .result-move').parent().prepend(
        $('<div>', {class: 'add-atk', title: 'Add this attack to the benchmark.'}).append($('<div>', {class: 'plus'}))
    )
    $('#resultMoveL1 + .btn').removeClass('btn-top').addClass('btn-top-left').nextAll('.add-atk').addClass('btn btn-top-right')
    $('#resultMoveL4 + .btn').removeClass('btn-bottom').addClass('btn-btm-left').nextAll('.add-atk').addClass('btn btn-btm-right')
    $('#resultMoveR1 + .btn').removeClass('btn-top').addClass('btn-top-right').prevAll('.add-atk').addClass('btn btn-top-left')
    $('#resultMoveR4 + .btn').removeClass('btn-bottom').addClass('btn-btm-right').prevAll('.add-atk').addClass('btn btn-btm-left')
    $('.add-atk:not(.btn)').addClass('btn btn-mid')
    
    let addBenchBtn = $('<div>', {id: 'addBenchBtn'}).append($('<div>', {class: 'plus'}))
    benchTabs.append(addBenchBtn)
    addBenchBtn.on('click', addBenchTab)
    addBenchTab()

    //add tab context menu
    let benchTabOptions = $('<div>', {id: 'benchTabOptions', style: 'display: none'})
    benchTabOptions.append([
        $('<span>', {id: 'benchRename', text: 'Rename'}),
        $('<span>', {id: 'benchCut', text: 'Cut'}),
        $('<span>', {id: 'benchCopy', text: 'Copy'}),
        $('<span>', {id: 'benchPaste', text: 'Paste'}) // grey out or hide if no copied bench
    ])
    $('body').prepend(benchTabOptions)
    $('#benchCut').on('click', removeBenchTab)

    benchTabs.on('contextmenu', '.bench-tab + .btn', function(e) {
        e.preventDefault()
        $(this).prev('.bench-tab').prop('checked', true)
        // add click function here?
        if (benchTabOptions.is(':hidden')) benchTabOptions.css({'display': 'flex'})
        benchTabOptions.css({'left': e.pageX, 'top': e.pageY})
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