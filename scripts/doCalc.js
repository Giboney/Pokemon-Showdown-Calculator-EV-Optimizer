var currB = -1;
var benchmarks = [];
var remainEVs = 508;
var editDefEVs = false;
var editAtkEVs = false;
var allKOChanceSets = [];
var cache = {};

$(".result-move").off("click");
stickyMoves = {
    lastClicked: $(".result-move:checked").attr('id'),
    clearStickyMove: function () {
        this.lastClicked = null;
        $('.locked-move').removeClass('locked-move');
    },
    setSelectedMove: function (slot) {
        this.lastClicked = slot;
    },
    getSelectedSide: function () {
        if (this.lastClicked) {
            if (this.lastClicked.indexOf('resultMoveL') !== -1) {
                return 'p1';
            } else if (this.lastClicked.indexOf('resultMoveR') !== -1) {
                return 'p2';
            }
        }
        return null;
    }
};

$(".result-move").click(function () {
    if (this.id === stickyMoves.lastClicked) {
        $(this).toggleClass("locked-move");
    } else {
        $('.locked-move').removeClass('locked-move');
    }
    stickyMoves.lastClicked = this.id;
});

function createBenchBtn() {
    benchmarks.push([]);
    currB = benchmarks.length - 1;
    benchmarks[currB].push(0); //acceptChance
    benchmarks[currB].push([false,['-','-','-'], ['1','1','1'], ['-','-','-'], ['1','1','1'], "0"]); //hpmods
    //[use sub, heal fracs, heal xtimes, dam fracs, dam xtimes, other]
    if (currB < 3) {
        $("#benchbtndiv").append([
            $("<input>", {id: currB, class: "visually-hidden gotobench", type: "radio", name: "goBench", value: currB}),
            $("<label>", {id: currB + "L", class: "btn gotobench", for: currB, text: "Benchmark " + (currB + 1), style: "width: 8.1em; margin-right: 2px; margin-top: -1px; border-radius: 8px 8px 0px 0px"})
        ]);
        if (currB % 3 != 0) {
            $("#" + currB + "L").css({"border-top-left-radius": 0});
            if (currB % 3 == 1) {
                $("#" + (currB - 1) + "L").css({"border-top-right-radius": 0});
            } else if (currB % 3 == 2) {
                $("#" + (currB - 1) + "L").css({"border-radius": 0});
            }
        }
    } else if (currB == 3) {
        $("#" + (currB - 1)).remove();
        $("#" + (currB - 1) + "L").remove();
        $("#benchbtndiv").append([
            $("<input>", {id: "benchdropbtn", class: "visually-hidden gotobench", type: "radio", name: "goBench", value: currB}),
            $("<select>", {id: "benchdropdown", class: "btn gotobench btn-right", style: "width: 9.55em; height: 1.9em; font: 10pt Verdana, sans-serif; padding: 3.5px 4px 4px; margin-right: 3px; border-bottom-right-radius: 0"}).append([
                $("<option>", {html: "Benchmark " + currB, value: (currB - 1)}),
                $("<option>", {html: "Benchmark " + (currB + 1), value: currB})
            ])
        ]);
        $("#benchdropdown").val(currB);
        $("#benchdropdown").click(function () {
            $("#benchdropbtn").click();
        });
        $("#benchdropdown").change(function () {
            $("#benchdropbtn").val($(this).val());
            $("#benchdropbtn").change();
        });
    } else {
        $("#benchdropdown").append($("<option>", {html: "Benchmark " + (currB + 1), value: currB}));
        $("#benchdropdown").val(currB);
    }

    $(".gotobench:radio[name='goBench']").change(function () {
        if ($(this).attr("id") == "benchdropbtn") {
            $("#benchdropdown").css({fontWeight: "bold"});
        } else {
            $("#benchdropdown").css({fontWeight: "normal"});
        }
        currB = Number($(this).val());
        printCurrBench();
    });
    if (benchmarks.length <= 3) {
        $("#" + currB).click();
    } else {
        $("#benchdropdown").click();
        $("#benchdropdown").change();
    }
}

function printCurrBench() {
    $("#chanceinput").val(benchmarks[currB][0]);
    $("#anydamin").val(benchmarks[currB][1][5]);
    $("#subtankL").prop("checked", benchmarks[currB][1][0]);
    $("#selatknat").val("");
    for (let i = 0; i < 3; i++) {
        $("#healselect" + i).val(benchmarks[currB][1][1][i]);
        $("#healin" + i).val(benchmarks[currB][1][2][i]);
        $("#damselect" + i).val(benchmarks[currB][1][3][i]);
        $("#damin" + i).val(benchmarks[currB][1][4][i]);
    }
    $("#movesinbench").empty();
    cache = {};
    if (benchmarks[currB].length <= 2) {
        $("#movesinbench").append($("<label>", {text: "No Moves"}));
        $("#kochanceL").text("0.00% Chance to KO");
    } else {
        //let tempatkevs = [];
        let EVs = benchmarks[currB][2][1].evs;
        for (let i = 2; i < benchmarks[currB].length; i++) {
            let attacker = benchmarks[currB][i][0].clone();
            let defender = benchmarks[currB][i][1].clone();
            let move = benchmarks[currB][i][2];
            let field = benchmarks[currB][i][3];
            //tempatkevs.push(structuredClone(attacker.evs));
            if (editDefEVs) {
                defender.evs.hp = Number($("#defhpevs").val());
                defender.evs.def = Number($("#defdefevs").val());
                defender.evs.spd = Number ($("#defspdevs").val());
                EVs = defender.evs;
            }
            // if (editAtkEVs) {
            //     attacker.evs.atk = Number($("#atkatkevs").val());
            //     attacker.evs.def = Number($("#atkdefevs").val());
            //     attacker.evs.spa = Number($("#atkspaevs").val());
            // }
            let result = calc.calculate(gen, attacker, defender, move, field);
            let desc = result.fullDesc("%", false).split(":")[0];
            if (!editDefEVs) {
                let nature = defender.nature;
                if ((move.category == "Physical" && (
                    nature == "Bold" ||
                    nature == "Gentle" ||
                    nature == "Hasty" ||
                    nature == "Impish" ||
                    nature == "Lax" ||
                    nature == "Lonely" ||
                    nature == "Mild" ||
                    nature == "Relaxed")) ||
                    (move.category == "Special" && (
                    nature == "Calm" ||
                    nature == "Careful" ||
                    nature == "Gentle" ||
                    nature == "Lax" ||
                    nature == "Naive" ||
                    nature == "Naughty" ||
                    nature == "Rash" ||
                    nature == "Sassy"))) {
                    nature = " " + nature;
                } else {
                    nature = "";
                }
                desc = desc.split("vs.");
                attacker = desc[0];
                defender = desc[1].split("/");
                if (!defender[1]) {
                    let temp = defender[0].split(" HP");
                    if (temp[1]) {
                        defender = defender[0].split(" HP")[1];
                    }
                } else {
                    if (defender[0].includes("+") || defender[0].includes("-")) {
                        defender[0] = " " + defender[0].trim().split(" ")[0];
                    } else {
                        defender[0] = "";
                    }
                    if (defender[1].includes(" Def")) {
                        defender[1] = defender[1].split(" Def")[1];
                    } else if (defender[1].includes(" SpD")) {
                        defender[1] = defender[1].split(" SpD")[1];
                    } else {
                        defender[1] = "idk something happened";
                    }
                    defender = defender[0] + defender[1];
                }
                desc = attacker + "vs" + nature + defender;
            }
            $("#movesinbench").append($("<label>", {id: i + "BL", class: "moveL", text: desc, style: "display: block; padding: 0.5px 2px 1.5px"}));
        }
        updateKOChance();
        // for (let i = 2; i < benchmarks[currB].length; i++) {
        //     benchmarks[currB][i][0].evs = tempatkevs[i - 2];
        // }
    }
    $(".moveL").hover(function () {
        if (!$(this).hasClass("seldatk")) {
            $(this).css({color: "white", background: "#3875d7"});
        }
    }, function () {
        if (!$(this).hasClass("seldatk")) {
            $(this).css({color: "var(--text)", background: "var(--background)"});
        }
    });

    $(".moveL").click(function () {
        if ($(this).hasClass("seldatk")) {
            $(this).css({background: "#3875d7"});
            $(this).removeClass("seldatk");
        } else {
            $(this).css({color: "white", background: "#1e90ff"});
            $(this).addClass("seldatk");
        }
        $("#selallatks").prop("checked", false);
        if ($(".seldatk").length > 1) {
            $("#popatk").html("Remove Attacks");
        } else {
            $("#popatk").html("Remove Attack");
        }
    });
    $("#selallatks").prop("checked", false);
    $("#popatk").html("Remove Attack");
}


$(".move-result-subgroup")[0].style.width = "36%";
$(".move-result-subgroup")[1].style.width = "36%";

$(".move-result-subgroup").eq(1).before($("<div>", {id: "benchdiv", class: "move-result-subgroup", title: "", style: "width: 28%; min-height: 10em;"}).append([
    $("<div>", {id: "benchbtndiv"}),
    $("<div>", {id: "movesinbench", style: "height: 8.57em; min-height: 8.57em; overflow-y: auto; padding: 2px; box-sizing: border-box; margin: 0px 7px 0px -3px; border: 1px solid #AAAAAA; resize: vertical"})
]));

var KOChanceField = $("<fieldset>", {id: "kochancefield", style: "width: 96em; display: flex; justify-content: center; align-items: center; padding-left: 5px; padding-right: 5px;"});
$(".main-result-group").after(KOChanceField);
KOChanceField.append([
    $("<legend>", {align: "center", text: "KO Chance Calculator"}),
    $("<div>", {id: "kocatkdiv", align: "right", style: "width: 40%"}).append([
        $("<label>", {class: "atkevs", text: "Atk ", style: "margin-right: 2px; visibility: hidden"}),
        $("<input>", {id: "atkatkevs", class: "atkevs", type: "number", step: "4", value: 0, inputmode: "decimal", style: "width: 3em; height: 20px; margin-right: 5px; visibility: hidden"}),
        $("<label>", {class: "atkevs", text: "Def ", style: "margin-right: 2px; visibility: hidden"}),
        $("<input>", {id: "atkdefevs", class: "atkevs", type: "number", step: "4", value: 0, inputmode: "decimal", style: "width: 3em; height: 20px; margin-right: 5px; visibility: hidden"}),
        $("<label>", {class: "atkevs", text: "SpA ", style: "margin-right: 2px; visibility: hidden"}),
        $("<input>", {id: "atkspaevs", class: "atkevs", type: "number", step: "4", value: 0, inputmode: "decimal", style: "width: 3em; height: 20px; visibility: hidden"}),
        $("<input>", {id: "editatkevsbtn", class: "visually-hidden", type: "checkbox"}),
        $("<label>", {id: "editatkevsL", class: "btn", for: "editatkevsbtn", text: "Edit Attacker EVs", title: "Edit selected attacks.", style: "width: 10.5em; height: 14px; margin: 5px; padding: 1px 3px 4px"})
    ]),
    $("<div>", {id: "kochancediv", align: "center", style: "width: 20%"}).append([
        $("<label>", {id: "kochanceL", style: "font-size: 1.1em; font-weight: bold; margin: 5px"})
    ]),
    $("<div>", {id: "kocdefdiv", align: "left", style: "width: 40%"}).append([
        $("<input>", {id: "editdefevsbtn", class: "visually-hidden", type: "checkbox"}),
        $("<label>", {id: "editdefevsL", class: "btn", for: "editdefevsbtn", text: "Edit Defender EVs", style: "width: 10.5em; height: 14px; margin: 5px; padding: 1px 3px 4px"}),
        $("<label>", {class: "defevs", text: "HP ", style: "margin-right: 2px; visibility: hidden"}),
        $("<input>", {id: "defhpevs", class: "defevs evin", type: "number", step: "4", value: 0, inputmode: "decimal", style: "width: 3em; height: 20px; margin-right: 5px; visibility: hidden"}),
        $("<label>", {class: "defevs", text: "Def ", style: "margin-right: 2px; visibility: hidden"}),
        $("<input>", {id: "defdefevs", class: "defevs evin", type: "number", step: "4", value: 0, inputmode: "decimal", style: "width: 3em; height: 20px; margin-right: 5px; visibility: hidden"}),
        $("<label>", {class: "defevs", text: "SpD ", style: "margin-right: 2px; visibility: hidden"}),
        $("<input>", {id: "defspdevs", class: "defevs evin", type: "number", step: "4", value: 0, inputmode: "decimal", style: "width: 3em; height: 20px; visibility: hidden"})
    ])
]);

var benchOptionsField = $("<fieldset>", {id: "benchoptionsfield", style: "width: 96em; display: flex;flex-direction: row; padding-left: 5px; padding-right: 5px;"});
KOChanceField.after(benchOptionsField);
$("#benchoptionsfield").append([
    $("<legend>", {align: "center", text: "EV Optimizer"}),
    $("<div>", {id: "healthdiv", align: "right", style: "width: 35%; margin-right: 0.5%"}),
    $("<div>", {id: "btndiv", align: "right", style: "width: 30%;"}),
    $("<div>", {id: "rolldiv", align: "left", style: "width: 34.7%; margin-left: 0.8%; display: flex"}),
]);

$("#btndiv").append([
    $("<select>", {id: "selatknat", title: "Applies to selected attacks.", style: "height: 26px; margin: 0px 47px 3px 0px"}).append([
        $("<option>", {html: "-Attacker Nature"}),
        $("<option>", {html: "Adamant (+Atk, -SpA)"}),
        $("<option>", {html: "Bold (+Def, -Atk)"}),
        $("<option>", {html: "Brave (+Atk, -Spe)"}),
        $("<option>", {html: "Calm (+SpD, -Atk)"}),
        $("<option>", {html: "Careful (+SpD, -SpA)"}),
        $("<option>", {html: "Docile (+Def, -Def)"}),
        $("<option>", {html: "Gentle (+SpD, -Def)"}),
        $("<option>", {html: "Hasty (+Spe, -Def)"}),
        $("<option>", {html: "Impish (+Def, -SpA)"}),
        $("<option>", {html: "Jolly (+Spe, -SpA)"}),
        $("<option>", {html: "Lax (+Def, -SpD)"}),
        $("<option>", {html: "Lonely (+Atk, -Def)"}),
        $("<option>", {html: "Mild (+SpA, -Def)"}),
        $("<option>", {html: "Modest (+SpA, -Atk)"}),
        $("<option>", {html: "Naive (+Spe, -SpD)"}),
        $("<option>", {html: "Naughty (+Atk, -SpD)"}),
        $("<option>", {html: "Quiet (+SpA, -Spe)"}),
        $("<option>", {html: "Rash (+SpA, -SpD)"}),
        $("<option>", {html: "Relaxed (+Def, -Spe)"}),
        $("<option>", {html: "Sassy (+SpD, -Spe)"}),
        $("<option>", {html: "Timid (+Spe, -Atk)"})
    ]),
    $("<input>", {id: "selallatks", class: "visually-hidden", type: "checkbox"}),
    $("<label>", {class: "btn", for: "selallatks", text: "Select All Attacks", style: "width: 10em; height: 14px; margin: -1px 0px 4px; padding: 1px 3px 4px;"}),
    "<br>",
    $("<button>", {id: "saveatk", class: "btn-left", html: "Add Attack", style: "margin: 0px; width: 22%; height: 30px; border-bottom-left-radius: 0"}),
    $("<button>", {id: "popatk", class: "btn-mid", html: "Remove Attack", title: "Remove selected attacks or bottom attack.", style: "margin: 0px; width: 29%; height: 30px"}),
    $("<button>", {id: "addbench", class: "btn-mid", html: "Add Bench", style: "margin: 0px; width: 22%; height: 30px"}),
    $("<button>", {id: "popbench", class: "btn-right", html: "Remove Bench", title: "Remove selected benchmark.", style: "margin: 0px; width: 27%; height: 30px; border-bottom-right-radius: 0"}),
    "<br>",
    $("<button>", {id: "calcbtn", html: "Optimize EVs", width: "100%", style: "height: 40px; width: 100%; font-size: 1.5em; margin: 0px; border-radius: 0px 0px 8px 8px"})
]);

//for normal buttons
// $("#btndiv").append([
//     $("<button>", {id: "saveatk", html: "Add Attack", style: "width: 21%; height: 30px"}),
//     $("<button>", {id: "popatk", html: "Remove Attack", style: "width: 28%; height: 30px"}),
//     $("<button>", {id: "addbench", html: "Add Bench", style: "width: 22%; height: 30px"}),
//     $("<button>", {id: "popbench", html: "Remove Bench", style: "width: 29%; height: 30px"}),
//     "<br>",
//     $("<button>", {id: "calcbtn", html: "Optimize EVs", width: "100%", style: "height: 40px; width: 100%; font-size: 1.5em; margin: 0px;"})
// ]);

$("#rolldiv").append([
    $("<div>", {width: "60%"}).append([
        $("<select>", {id: "seldefnat", title: "Applies to all benchmarks.", style: "height: 26px; margin-right: 5px"}).append([
            $("<option>", {html: "-Defender Nature"}),
            $("<option>", {html: "Adamant (+Atk, -SpA)", value: "Adamant"}),
            $("<option>", {html: "Bold (+Def, -Atk)", value: "Bold"}),
            $("<option>", {html: "Bashful (+SpA, -SpA)", value: "Bashful"}),
            $("<option>", {html: "Brave (+Atk, -Spe)", value: "Brave"}),
            $("<option>", {html: "Calm (+SpD, -Atk)", value: "Calm"}),
            $("<option>", {html: "Careful (+SpD, -SpA)", value: "Careful"}),
            $("<option>", {html: "Docile (+Def, -Def)", value: "Docile"}),
            $("<option>", {html: "Gentle (+SpD, -Def)", value: "Gentle"}),
            $("<option>", {html: "Hardy (+Atk, -Atk)", value: "Hardy"}),
            $("<option>", {html: "Hasty (+Spe, -Def)", value: "Hasty"}),
            $("<option>", {html: "Impish (+Def, -SpA)", value: "Impish"}),
            $("<option>", {html: "Jolly (+Spe, -SpA)", value: "Jolly"}),
            $("<option>", {html: "Lax (+Def, -SpD)", value: "Lax"}),
            $("<option>", {html: "Lonely (+Atk, -Def)", value: "Lonely"}),
            $("<option>", {html: "Mild (+SpA, -Def)", value: "Mild"}),
            $("<option>", {html: "Modest (+SpA, -Atk)", value: "Modest"}),
            $("<option>", {html: "Naive (+Spe, -SpD)", value: "Naive"}),
            $("<option>", {html: "Naughty (+Atk, -SpD)", value: "Naughty"}),
            $("<option>", {html: "Quiet (+SpA, -Spe)", value: "Quiet"}),
            $("<option>", {html: "Quirky (+SpD, -SpD)", value: "Quirky"}),
            $("<option>", {html: "Rash (+SpA, -SpD)", value: "Rash"}),
            $("<option>", {html: "Relaxed (+Def, -Spe)", value: "Relaxed"}),
            $("<option>", {html: "Sassy (+SpD, -Spe)", value: "Sassy"}),
            $("<option>", {html: "Serious (+Spe, -Spe)", value: "Serious"}),
            $("<option>", {html: "Timid (+Spe, -Atk)", value: "Timid"})
        ]),
        "<br>",
        $("<label>", {id: "chancelabel", text: "Acceptable % Chance to KO", title: "Applies to selected benchmark only.", style: "margin-top: 5px"}),
        $("<input>", {id: "chanceinput", type: "number", step: "0.25", value: "0", inputmode: "decimal", style: "width: 50px; height: 20px; margin: 5px"}),
        "<br>",
        $("<label>", {id: "reaminevslabel", text: "Available EVs ", title: "Applies to all benchmarks."}),
        $("<input>", {id: "remainevsinput", type: "number", step: "4", value: "508", inputmode: "decimal", style: "width: 50px; height: 20px; margin-top: 3px; margin-right: 28px"})
    ]),
    $("<div>", {style: "width: 39%"}).append([
        $("<button>", {id: "resetbenches", html: "Clear All Benchmarks", style: "width: 100%; height: 30%; font-size: 1.2em"}),
        $("<br>"),
        $("<div>", {text: "EVs Used", style: "font-size: 1.1em; margin: 10.33px 0px 7px 26px"}),
        $("<label>", {text: "Atk ", style: "margin-right: 8.5px; margin-left: -77px"}),
        $("<input>", {id: "defatkevs", class: "usedevs evin", type: "number", step: "4", value: 0, inputmode: "decimal", style: "width: 3em; height: 20px; margin-right: 5px; margin-left: -7px"}),
        $("<label>", {text: "SpA ", style: "margin-right: 2px"}),
        $("<input>", {id: "defspaevs", class: "usedevs evin", type: "number", step: "4", value: 0, inputmode: "decimal", style: "width: 3em; height: 20px; margin-right: 5px"}),
        $("<label>", {text: "Spe ", style: "margin-right: 2px"}),
        $("<input>", {id: "defspeevs", class: "usedevs evin", type: "number", step: "4", value: 0, inputmode: "decimal", style: "width: 3em; height: 20px"})
    ])
]);

$("#healthdiv").append($("<label>", {id: "healbl", text: "Heal ", style: "display: inline-block", width: "60px"}).css({marginRight: "5px"}));
for (let i = 0; i < 3; i++) {
    $("#healthdiv").append([
        $("<select>", {id: "healselect" + i, class: "healselval", width: "72px", height: "26px"}).append([
            $("<option>", {html: "-"}),
            $("<option>", {html: "1/16"}),
            $("<option>", {html: "1/8"}),
            $("<option>", {html: "1/4"}),
            $("<option>", {html: "1/3"}),
            $("<option>", {html: "1/2"}),
            $("<option>", {html: "2/3"}),
            $("<option>", {html: "Leech Seed"}),
        ]),
        $("<input>", {id: "healin" + i, class: "healinmulti", type: "number", step: "1",
        value: "1", inputmode: "decimal", style: "width: 40px; height: 20px; margin-right: 5px"})
    ]);
}

$("#healthdiv").append(["<br>", $("<label>", {id: "damlbl", text: "Damage ", style: "display: inline-block", width: "60px"}).css({marginRight: "5px"})]);
for (let i = 0; i < 3; i++) {
    $("#healthdiv").append([
        $("<select>", {id: "damselect" + i, class: "damselval", style: "width: 72px; height: 26px; margin-top: 5px"}).append([
            $("<option>", {html: "-"}),
            $("<option>", {html: "1/16"}),
            $("<option>", {html: "1/10"}),
            $("<option>", {html: "1/8"}),
            $("<option>", {html: "1/6"}),
            $("<option>", {html: "1/4"}),
            $("<option>", {html: "1/3"}),
            $("<option>", {html: "1/2"}),
            $("<option>", {html: "Toxic"}),
            $("<option>", {html: "Struggle"}),
            $("<option>", {html: "Steel Beam"}),
        ]),
        $("<input>", {id: "damin" + i, class: "daminmulti", type: "number", step: "1", value: "1", inputmode: "decimal", style: "width: 40px; height: 20px; margin-top: 5px; margin-right: 5px"})
    ]);
}

$("#healthdiv").append([
    "<br>",
    $("<label>", {id: "anydamlbl", text: "Other Damage ", style: "display: inline-block; width: 100px; margin-right: 5px"}),
    $("<input>", {id: "anydamin", type: "number", step: "1", value: "0", inputmode: "decimal", style: "width: 40px; height: 20px; margin-top: 5px; margin-right: 50px"})
]);

$("#healthdiv").append([
    $("<input>", {id: "subtankL", class: "visually-hidden", type: "checkbox"}),
    $("<label>", {class: "btn", for: "subtankL", text: "Tank with Substitute", title: "Ignores other HP modifiers.", style: "width: 12em; height: 18px; margin-right: 70px; margin-top: 5px"})
]);

$("[aria-label='Field information']").before($("<fieldset>", {id: "optimalfield", style: "width: 27.5em"}));
$("#optimalfield").append([
    $("<legend>", {text: "Optimal EVs"}),
    $("<div>", {id: "optimalevsdiv", style: "height: 3em; min-height: 3em; overflow-y: auto; box-sizing: border-box; resize: vertical; border: 1px solid #AAAAAA; padding: 2px;"})/*.append([
        $("<div>", {id: "Loptimalevsdiv", width: "69%"}),
        $("<div>", {id: "Roptimalevsdiv", width: "31%"})
    ])*/
]);

createBenchBtn();

$("#tooltipText").css({left: "47.1%"});
$(".main-result-group").attr({style: "display: flex; flex-direction: column; align-items: center; margin-top: 0.5em; width: 100%"});
$(".big-text").attr({style: "text-align: right"});

$(".small-text").attr({title: "Click to copy.", style: "font-size: 1em"});
$(".small-text").append($("<div>", {id: "smalltooltipText", text: "Copied", style: "position: absolute; left: 58.2em; background-color: rgba(0, 0, 0, 0.7); color: white; border-radius: 5px; padding: 5px; font-size: 0.9em; visibility: hidden;"}));

$("button").addClass("btn btn-xxxwide"); //opera buttons are ugly and i like these ones better anyway

$(".small-text").hover(function (){
    $("#damageValues").css({opacity: "0.7"});
}, function () {
    $("#damageValues").css({opacity: "1"});
});

$(".small-text").click(function () {
    navigator.clipboard.writeText($("#damageValues").text()).then(function () {
        document.getElementById('smalltooltipText').style.visibility = 'visible';
        setTimeout(function () {
            document.getElementById('smalltooltipText').style.visibility = 'hidden';
        }, 1500);
    });
});

$(".healselval").change(function () {
    benchmarks[currB][1][1][$(this).attr("id").substring(10)] = $(this).val();
    printCurrBench();
});

$(".healinmulti").change(function () {
    $(this).val(Math.round($(this).val()));
    if ($(this).val() < 0) {
        $(this).val(0);
    }
    benchmarks[currB][1][2][$(this).attr("id").substring(6)] = $(this).val();
    printCurrBench();
});

$(".damselval").change(function () {
    benchmarks[currB][1][3][$(this).attr("id").substring(9)] = $(this).val();
    printCurrBench();
});

$(".daminmulti").change(function () {
    $(this).val(Math.round($(this).val()));
    if ($(this).val() < 0) {
        $(this).val(0);
    }
    benchmarks[currB][1][4][$(this).attr("id").substring(5)] = $(this).val();
    printCurrBench();
});

$("#seldefnat").change(function () {
    var nat = $(this).val();
    if (nat[0] == "-") {
        nat = "Serious";
    } else {
        nat = nat.split("(")[0];
    }
    nat = nat.trim();
    for (let b = 0; b < benchmarks.length; b++) {
        for (let a = 2; a < benchmarks[b].length; a++) {
            benchmarks[b][a][1].nature = nat;
        }
    }
    printCurrBench();
});

$("#selatknat").change(function () {
    var nat = $(this).val();
    if (nat[0] == "-") {
        nat = "Serious";
    } else {
        nat = nat.split("(")[0].trim();
    }
    var selectedAtks = $(".seldatk");
    if (selectedAtks.length > 0) {
        for (let i = 0; i < selectedAtks.length; i++) {
            benchmarks[currB][Number(selectedAtks[i].id.split("BL")[0])][0].nature = nat;
        }
    }
    printCurrBench();
});

$("#selallatks").change(function () {
    if ($(this).is(":checked")) {
        $(".moveL").css({color: "white", background: "#1e90ff"});
        $(".moveL").addClass("seldatk");
        if (benchmarks[currB].length > 3) {
            $("#popatk").html("Remove Attacks");
        }
    } else {
        $(".moveL").click();
        $(".moveL").trigger("mouseleave");
        $("#popatk").html("Remove Attack");
    }
});

$("#anydamin").change(function () {
    $(this).val(Math.round($(this).val()));
    benchmarks[currB][1][5] = $(this).val();
    printCurrBench();
});

$("#subtankL").change(function () {
    if ($(this).is(":checked")) {
        benchmarks[currB][1][0] = true;
    } else {
        benchmarks[currB][1][0] = false;
    }
    printCurrBench();
});

$("#chanceinput").change(function () {
    var value = Number($(this).val());
    if (value < 0) {
        value = 0;
    } else if (value > 100) {
        value = 100;
    }
    $(this).val(value);
    benchmarks[currB][0] = value;
});

$("#remainevsinput").change(function () {
    let value = Number($(this).val());
    if (value < 0) {
        value = 0;
    } else if (value > 508) {
        value = 508;
    }
    $(this).val(value);
    remainEVs = value;
});

$("#popbench").click(function () {
    if (benchmarks.length <= 3) {
        $("#" + currB).remove();
        $("#" + currB + "L").remove();
        benchmarks.splice(currB, 1);
        if (currB >= benchmarks.length) {
            currB--;
        }
        if (benchmarks.length == 0) {
            createBenchBtn();
        } else {
            for (let i = currB; i < benchmarks.length; i++) {
                $("#" + (i + 1)).attr({id: i, value: i});
                $("#" + (i + 1) + "L").attr({id: i + "L", for: i});
                $("#" + i + "L").text("Benchmark " + (i + 1));
                if (i == benchmarks.length - 1) {
                    if (i % 3 == 0) {
                        $("#" + i + "L").attr({class: "btn gotobench"});
                        $("#" + i + "L").css({"border-radius": "8px 8px 0px 0px"});
                    } else {
                        $("#" + i + "L").attr({class: "btn gotobench"});
                        $("#" + i + "L").css({"border-top-right-radius": "8px"});
                    }
                } else if (i % 3 == 0) {
                    $("#" + i + "L").attr({class: "btn gotobench"});
                    $("#" + i + "L").css({"border-top-left-radius": "8px"});
                } else if (i % 3 == 1) {
                    $("#" + i + "L").attr({class: "btn btn-mid gotobench"});
                } else {
                    $("#" + i + "L").attr({class: "btn gotobench"});
                }
            }
        }
        if (currB % 3 == 0) {
            if (currB == benchmarks.length - 1) {
                $("#" + currB + "L").attr({class: "btn gotobench"});
            } else {
                $("#" + currB + "L").attr({class: "btn btn-left gotobench"});
            }
        } else if (currB % 3 == 1 && currB != benchmarks.length - 1) {
            $("#" + currB + "L").attr({class: "btn btn-mid gotobench"});
        } else if (currB % 3 == 2) {
            $("#" + currB + "L").attr({class: "btn btn-right gotobench"});
        }
        $("#" + currB).click();
    } else {
        if (currB >= 2) {
            $("#benchdropdown").children().eq(currB - 2).remove();
            benchmarks.splice(currB, 1);
            if (currB >= benchmarks.length) {
                currB--;
            }
            if (benchmarks.length == 3) {
                $("#benchdropbtn").remove();
                $("#benchdropdown").remove();
                let temp = benchmarks[2];
                benchmarks.splice(2, 1);
                createBenchBtn();
                benchmarks[2] = temp;
                printCurrBench();
            } else {
                for (let i = currB; i < benchmarks.length; i++) {
                    $("#benchdropdown").children().eq(i - 2).html("Benchmark " + (i + 1)).val(i);
                }
                $("#benchdropdown").val(currB);
                $("#benchdropdown").change();
            }
        } else {
            if ($("#benchdropdown").val() == benchmarks.length - 1) {
                $("#benchdropdown").val(benchmarks.length - 2);
                $("#benchdropbtn").val(benchmarks.length - 2);
            }
            $("#benchdropdown").children().last().remove();
            benchmarks.splice(currB, 1);
            if (currB >= benchmarks.length) {
                currB--;
            }
            if (benchmarks.length == 3) {
                $("#benchdropbtn").remove();
                $("#benchdropdown").remove();
                let temp = [benchmarks[2], currB];
                benchmarks.splice(2, 1);
                createBenchBtn();
                benchmarks[2] = temp[0];
                currB = temp[1];
                $("#" + currB).click();
            } else {
                printCurrBench();
            }
        }
    }
});

$("#addbench").click(function () {
    createBenchBtn();
    $("#chanceinput").val(0);
});

$("#popatk").click(function() {
    var selectedAtks = $(".seldatk");
    if (selectedAtks.length > 0) {
        for (let i = 0; i < selectedAtks.length; i++) {
            benchmarks[currB][Number(selectedAtks[i].id.split("BL")[0])] = 0;
        }
        for (let a = 2; a < benchmarks[currB].length; a++) {
            if (benchmarks[currB][a] === 0) {
                benchmarks[currB].splice(a, 1);
                a--;
            }
        }
    } else if (benchmarks[currB].length > 2) {
        benchmarks[currB].pop();
    }
    printCurrBench();
});

$("#saveatk").click(function () {
    const moveinfo = stickyMoves.lastClicked;
    var attacker = createPokemon($("#p1"));
    var defender = createPokemon($("#p2"));
    var field = createField();
    if (moveinfo.substring(0, 11) === "resultMoveR") {
        const temp = attacker;
        attacker = defender;
        defender = temp;
        field.swap();
    }
    var move = attacker.moves[Number(moveinfo.substring(11)) - 1];
    var defnat = $("#seldefnat").val();
    if (defnat[0] == "-") {
        $("#seldefnat").val(defender.nature);
    } else {
        defender.nature = defnat.split("(")[0].trim();
    }
    if (move.hits > 1) {
        let numHits = move.hits;
        let moveID = move.name.replace(/ /g, '').toLowerCase();
        let moveCopy = JSON.parse(JSON.stringify(move.gen.moves.get(moveID)));
        moveCopy.multihit = 1;
        MOVES_BY_ID[gen][moveID + "1hit"] = moveCopy;
        move = new Move(move.gen, move.originalName + " 1 hit", {
            ability: move.ability,
            item: move.item,
            species: move.species,
            isCrit: move.isCrit,
            isStellarFirstUse: move.isStellarFirstUse,
            hits: 1,
            timesUsedWithMetronome: move.timesUsedWithMetronome
        });
        let result = calc.calculate(gen, attacker, defender, move, field);
        let desc = result.fullDesc("%", false);
        if (desc.includes("Berry")) {
            numHits -= 1;
            benchmarks[currB].push([attacker, defender, move, field]);
            defender = defender.clone();
            defender.item = "";
        }
        if (move.name == "Triple Axel") {
            if (numHits == 3) {
                benchmarks[currB].push([attacker, defender, move, field]);
            }
            move = new Move(move.gen, "Ice Shard", {
                ability: move.ability,
                item: move.item,
                species: move.species,
                isCrit: move.isCrit,
                isStellarFirstUse: move.isStellarFirstUse,
                timesUsedWithMetronome: move.timesUsedWithMetronome,
            });
            benchmarks[currB].push([attacker, defender, move, field]);
            move = new Move(move.gen, "Avalanche", {
                ability: move.ability,
                item: move.item,
                species: move.species,
                isCrit: move.isCrit,
                isStellarFirstUse: move.isStellarFirstUse,
                timesUsedWithMetronome: move.timesUsedWithMetronome,
            });
            benchmarks[currB].push([attacker, defender, move, field]);
        } else {
            for (let i = 0; i < numHits; i++) {
                benchmarks[currB].push([attacker, defender, move, field]);
            }
        }
    } else {
        benchmarks[currB].push([attacker, defender, move, field]);
    }
    printCurrBench();
});

$(".evin").change(function () {
    let value = Number($(this).val());
    if (value < 0) {
        value = 0;
    } else if (value > 252) {
        value = 252;
    }
    $(this).val(value);
    printCurrBench();
});

$("#editdefevsbtn").change(function () {
    editDefEVs = $(this).is(":checked");
    if (editDefEVs) {
        $(".defevs").css({visibility: "visible"});
    } else {
        $(".defevs").css({visibility: "hidden"});
    }
    printCurrBench();
});

$(".atkevs").change(function () {
    let value = Number($(this).val());
    if (value < 0) {
        value = 0;
    } else if (value > 252) {
        value = 252;
    }
    $(this).val(value);
    let selectedAtks = $(".seldatk");
    let stat = $(this).attr("id").substr(3, 3);
    if (selectedAtks.length > 0) {
        for (let i = 0; i < selectedAtks.length; i++) {
            let attacker = benchmarks[currB][Number(selectedAtks[i].id.split("BL")[0])][0];
            attacker.evs[stat] = value;
            benchmarks[currB][Number(selectedAtks[i].id.split("BL")[0])][0] = attacker.clone();
            let text = selectedAtks.eq(i).text();
            let j = 0;
            let stages = "";
            let atkstat = "";
            if (text[0] == '+' || text[0] == '-') {
                j = 2;
                stages = text.slice(0, 3);
            }
            if (j == 2) {
                atkstat = text.split(' ')[2].toLowerCase();
            } else {
                atkstat = text.split(' ')[1].toLowerCase();
            }
            if (stat == atkstat) {
                while (!isNaN(Number(text[j])) && j < text.length) {
                    j++;
                }
                if (text[j - 1] == ' ')  {
                    j--;
                }
                text = text.slice(j);
                text = stages + value + text;
                selectedAtks.eq(i).text(text);
            }
        }
        cache = {};
        updateKOChance();
    }
});

$("#editatkevsbtn").change(function () {
    editAtkEVs = $(this).is(":checked");
    if (editAtkEVs) {
        $(".atkevs").css({visibility: "visible"});
    } else {
        $(".atkevs").css({visibility: "hidden"});
    }
    $("#atkatkevs").change();
    $("#atkdefevs").change();
    $("#atkspaevs").change();
});

$(".usedevs").change(function () {
    let total = Number($("#defatkevs").val()) + Number($("#defspaevs").val()) + Number($("#defspeevs").val());
    let value = $(this).val();
    if (total > 508) {
        $(this).val(value - total + 508);
        total = 508;
    }
    $("#remainevsinput").val(508 - total);
    remainEVs = 508 - total;
});

$("#resetbenches").click(function () {
    $("#benchbtndiv").empty();
    $("#seldefnat").val("-");
    $("#selatknat").val("-");
    $(".evin").val(0);
    $(".atkevs").val(0);
    $("#remainevsinput").val(508);
    remainEVs = 508;
    benchmarks = [];
    createBenchBtn();
});

function KOChance(bench, EVs, b) {
    let defender = bench[2][1].clone();
    EVs['atk'] = defender.evs.atk;
    EVs['spa'] = defender.evs.spa;
    EVs['spe'] = defender.evs.spe;
    defender.evs = EVs;
    defender = defender.clone();
    let totalHP = defender.stats.hp;
    let allDmgRolls = [];
    for (let i = 2; i < bench.length; i++) {
        let key = `${b}-${EVs.def}-${EVs.spd}-${i}`;
        let res = cache[key];
        if (!res) {
            const attacker = bench[i][0];
            defender = bench[i][1].clone();
            defender.evs = EVs;
            defender = defender.clone();
            const move = bench[i][2];
            const field = bench[i][3];
            res = calc.calculate(gen, attacker, defender, move, field).damage;
            if (res == [0]) {
                res = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
            }
            cache[key] = res;
        }

        allDmgRolls.push(res);
    }
    totalHP = applyHPmods(totalHP, bench, b);
    return getChance(allDmgRolls, totalHP, bench[0]);
}

function applyHPmods(hp, bench, b) {
    // use cache here too
    var key = `${hp}-${b}`;
    var res = cache[key];
    if (!res) {
        if (!bench[1][0]) {
            var heal;
            var dmg;
            const startHP = hp;
            for (let i = 0; i < 3; i++) {
                heal = bench[1][1][i];
                if (heal.length > 1) {
                    switch (heal) {
                        case "Leech Seed":
                            hp += Math.floor(bench[2][0].stats.hp / 8) * Number(bench[1][2][i]);
                            break;
                        case "2/3":
                            hp += Math.floor(2 * startHP / Number(heal.substring(2))) * Number(bench[1][2][i]);
                            break;
                        default:
                            hp += Math.floor(startHP / Number(heal.substring(2))) * Number(bench[1][2][i]);
                    }
                }
                dmg = bench[1][3][i];
                if (dmg.length > 1) {
                    switch (dmg) {
                        case "Toxic":
                            for (let j = 1; j <= Number(bench[1][4][i]); j++) {
                                hp -= Math.floor(startHP / 16) * j;
                            }
                            break;
                        case "Struggle":
                            hp -= Math.round(startHP / 4) * Number(bench[1][4][i]);
                            break;
                        case "Steel Beam":
                            hp -= Math.ceil(startHP / 2) * Number(bench[1][4][i]);
                            break;
                        default:
                            hp -= Math.floor(startHP / Number(dmg.substring(2))) * Number(bench[1][4][i]);
                    }
                }
            }
            hp -= Number(bench[1][5]);
        } else {
            hp = Math.floor(hp / 4);
        }
        res = hp;
        cache[key] = hp;
    }
    return res;
}

function getChance(rolls, hp, chance) {
    var damage;
    if (chance == 0) {
        damage = 0;
        for (let i = 0; i < rolls.length; i++) {
            damage += rolls[i][15];
        }
        return hp > damage ? 0 : 100;
    }

    var numKOs = 0;
    switch (rolls.length) {
        case 1:
            for (let i = 0; i < 16; i++) {
                if (rolls[0][i] >= hp) {
                    numKOs++;
                }
            }
            return numKOs / 16 * 100;
        case 2:
            for (let i = 0; i < 16; i++) {
                for (let j = 0; j < 16; j++) {
                    damage = rolls[0][i] + rolls[1][j];
                    if (damage >= hp) {
                        numKOs++;
                    }
                }
            }
            return numKOs / 256 * 100;
        case 3:
            for (let i = 0; i < 16; i++) {
                for (let j = 0; j < 16; j++) {
                    for (let k = 0; k < 16; k++) {
                        damage = rolls[0][i] + rolls[1][j] + rolls[2][k];
                        if (damage >= hp) {
                            numKOs++;
                        }
                    }
                }
            }
            return numKOs / 4096 * 100;
        default:
            const numTrials = 10000;
            for (let r = 0; r < numTrials; r++) {
                damage = 0;
                for (let i = 0; i < rolls.length; i++) {
                    damage += rolls[i][Math.floor(Math.random() * 16)];
                }
                if (damage >= hp) {
                    numKOs++;
                }
            }
            return numKOs / numTrials * 100;
    }
}

function allOneSide() {
    var move;
    var cat = "No Moves";
    for (let b = 0; b < benchmarks.length; b++) {
        for (let i = 2; i < benchmarks[b].length; i++) {
            move = benchmarks[b][i][2];
            let moveCat = "Zero BP";
            if (move.bp != 0 || move.flags.contact == 1 || move.category == "Special" || move.name == "Fling") {
                if (move.name == "Psyshock" || move.name == "Psystrike" || move.name == "Secret Sword") {
                    moveCat = "Physical";
                } else {
                    moveCat = move.category;
                }
                if (moveCat != cat) {
                    if (cat == "No Moves" || cat == "Zero BP") {
                        cat = moveCat;
                    } else {
                        return "Mixed";
                    }
                }
            } else if (cat == "No Moves"){
                cat = moveCat;
            }
        }
    }
    if (cat == "Zero BP") {
        cat = "Physical";
    }
    return cat;
}

//var numIterations;
$("#calcbtn").click(function() {
    var time = Date.now();
    //numIterations = 0;
    var optimalEVs = [];
    var stringEVs = "";
    var notDead = true;
    cache = {};
    var EVs = {}, hp = 0, df = 0, sd = 0;
    var totalEVs = 0;
    const benchCat = allOneSide();

    switch (benchCat) {
        case "Physical":
            for (hp = 0; hp <= Math.min(252, remainEVs); hp += 4) {
                var dlow = 0, dhigh = Math.min(63, (remainEVs - hp) / 4);
                while (dlow <= dhigh) {
                    df = Math.floor((dlow + dhigh) / 2) * 4;
                    totalEVs = hp + df;
                    notDead = true;
                    EVs = {hp: hp, atk: 0, def: df, spa: 0, spd: 0, spe: 0};
                    for (let b = 0; b < benchmarks.length; b++) {
                        if (benchmarks[b].length > 2) {
                            notDead = benchmarks[b][0] >= KOChance(benchmarks[b], EVs, b);
                            //numIterations++;
                            if (!notDead) {
                                break;
                            }
                        }
                    }
                    if (notDead) {
                        var key1 = `${hp}-${'hp'}`;
                        var res1 = cache[key1];
                        if (!res1) {
                            optimalEVs.push([totalEVs, EVs]);
                            cache[key1] = [optimalEVs.length - 1, totalEVs];
                        } else if (totalEVs < res1[1]) {
                            optimalEVs[res1[0]] = [totalEVs, EVs];
                            cache[key1] = [res1[0], totalEVs];
                        }
                    }
                    if (notDead) {
                        dhigh = df / 4 - 1;
                    } else {
                        dlow = df / 4 + 1;
                    }
                }
            }
            break;
        case "Special":
            for (hp = 0; hp <= Math.min(252, remainEVs); hp += 4) {
                var slow = 0, shigh = Math.min(63, (remainEVs - hp) / 4);
                while (slow <= shigh) {
                    sd = Math.floor((slow + shigh) / 2) * 4;
                    totalEVs = hp + sd;
                    notDead = true;
                    EVs = {hp: hp, atk: 0, def: 0, spa: 0, spd: sd, spe: 0};
                    for (let b = 0; b < benchmarks.length; b++) {
                        if (benchmarks[b].length > 2) {
                            notDead = benchmarks[b][0] >= KOChance(benchmarks[b], EVs, b);
                            //numIterations++;
                            if (!notDead) {
                                break;
                            }
                        }
                    }
                    if (notDead) {
                        var key1 = `${hp}-${'hp'}`;
                        var res1 = cache[key1];
                        if (!res1) {
                            optimalEVs.push([totalEVs, EVs]);
                            cache[key1] = [optimalEVs.length - 1, totalEVs];
                        } else if (totalEVs < res1[1]) {
                            optimalEVs[res1[0]] = [totalEVs, EVs];
                            cache[key1] = [res1[0], totalEVs];
                        }
                    }
                    if (notDead) {
                        shigh = sd / 4 - 1;
                    } else {
                        slow = sd / 4 + 1;
                    }
                }
            }
            break;
        case "Mixed":
            for (hp = 0; hp <= Math.min(252, remainEVs); hp += 4) {
                for (df = Math.min(252, Math.max(0, remainEVs - hp - 252)); df <= Math.min(252, remainEVs - hp); df += 4) {
                    sd = Math.min(252, remainEVs - hp - df);
                    EVs = {hp: hp, atk: 0, def: df, spa: 0, spd: sd, spe: 0};
                    notDead = true;
                    for (let b = 0; b < benchmarks.length; b++) {
                        if (benchmarks[b].length > 2) {
                            notDead = benchmarks[b][0] >= KOChance(benchmarks[b], EVs, b);
                            if (!notDead) {
                                break;
                            }
                        }
                    }
                    if (notDead) {
                        break;
                    }
                }
                if (notDead) {
                    break;
                }
            }
            if (notDead) {
                for (hp = 0; hp <= Math.min(252, remainEVs); hp += 4) {
                    //tried to get this loop with binary search, but it doesnt work
                    //you end up skipping over ev spreads that would work :(
                    //basically its impossible to tell whether to check
                    //top half or bottom half based on inner loop
                    for (df = 0; df <= Math.min(252, remainEVs - hp); df += 4) {
                        var slow = 0, shigh = Math.min(63, (remainEVs - hp - df) / 4);
                        while (slow <= shigh) {
                            sd = Math.floor((slow + shigh) / 2) * 4;
                            totalEVs = hp + df + sd;
                            notDead = true;
                            EVs = {hp: hp, atk: 0, def: df, spa: 0, spd: sd, spe: 0};
                            for (let b = 0; b < benchmarks.length; b++) {
                                if (benchmarks[b].length > 2) {
                                    notDead = benchmarks[b][0] >= KOChance(benchmarks[b], EVs, b);
                                    //numIterations++;
                                    if (!notDead) {
                                        break;
                                    }
                                }
                            }
                            //console.log(hp + " " + df + " " + sd + " " + notDead);
                            if (notDead) {
                                var key1 = `${hp}-${'hp'}`;
                                var res1 = cache[key1];
                                if (!res1) {
                                    optimalEVs.push([totalEVs, EVs, key1]);
                                    cache[key1] = [optimalEVs.length - 1, totalEVs];
                                } else if (totalEVs == res1[1]) {
                                    optimalEVs.push([totalEVs, EVs, key1]);
                                } else if (totalEVs < res1[1]) {
                                    for (let i = 0; i < optimalEVs.length; i++) {
                                        if (optimalEVs[i][2] == key1) {
                                            optimalEVs.splice(i, 1);
                                            i--;
                                        }
                                    }
                                    optimalEVs.push([totalEVs, EVs, key1]);
                                    cache[key1] = [optimalEVs.length - 1, totalEVs];
                                }
                                // if ((!res1 && !res2) || (res1 && totalEVs == res1[1])) {
                                //     optimalEVs.push([totalEVs, EVs]);
                                //     cache[key1] = [optimalEVs.length - 1, totalEVs];
                                //     cache[key2] = true;
                                // } else if (res1 && totalEVs < res1[1]) {
                                //     optimalEVs[res1[0]] = [totalEVs, EVs];
                                //     cache[key1] = [res1[0], totalEVs];
                                //     cache[key2] = true;
                                // }
                            }
                            if (notDead) {
                                shigh = sd / 4 - 1;
                            } else {
                                slow = sd / 4 + 1;
                            }
                        }
                    }
                }
            }
            break;
    }
    $("#optimalevsdiv").empty();
    if (benchCat == "No Moves") {
        $("#optimalevsdiv").append($("<label>", {text: benchCat}));
    } else if (optimalEVs.length == 0) {
        allKOChanceSets = [];
        var bestKOChances = new Array(benchmarks.length).fill(100);
        if (benchCat != "Mixed") {
            if (benchCat == "Physical") {
                for (hp = Math.min(252, Math.max(0, remainEVs - 252)); hp <= Math.min(252, remainEVs); hp += 4) {
                    df = Math.min(252, remainEVs - hp);
                    EVs = {hp: hp, atk: 0, def: df, spa: 0, spd: 0, spe: 0};
                    allKOChanceSets = bestRollsHelper(allKOChanceSets, bestKOChances, EVs);
                }
            } else if (benchCat == "Special") {
                for (hp = Math.min(252, Math.max(0, remainEVs - 252)); hp <= Math.min(252, remainEVs); hp += 4) {
                    sd = Math.min(252, remainEVs - hp);
                    EVs = {hp: hp, atk: 0, def: 0, spa: 0, spd: sd, spe: 0};
                    allKOChanceSets = bestRollsHelper(allKOChanceSets, bestKOChances, EVs);
                }
            }
        } else {
            for (hp = 0; hp <= Math.min(252, remainEVs); hp += 4) {
                for (df = Math.min(252, Math.max(0, remainEVs - hp - 252)); df <= Math.min(252, remainEVs - hp); df += 4) {
                    sd = Math.min(252, remainEVs - hp - df);
                    EVs = {hp: hp, atk: 0, def: df, spa: 0, spd: sd, spe: 0};
                    allKOChanceSets = bestRollsHelper(allKOChanceSets, bestKOChances, EVs);
                }
            }
        }
        allKOChanceSets.sort(function(a, b) {
            var atot = 0;
            var btot = 0;
            for (let i = 0; i < a.length; i++) {
                atot += a[i];
                btot += b[i];
            }
            return atot - btot;
        });
        $("#optimalevsdiv").append($("<label>").append([
            $("<span>", {text: "Impossible"}),
            $("<br>"),
            $("<span>", {text: "Best Possible Rolls"}),
            $("<br>")
        ]));
        for (let i = 0; i < allKOChanceSets.length; i++) {
            var totalChance = 0;
            $("#optimalevsdiv").append($("<label>", {id: "rolls" + i, class: "rollsbtn", title: "Click to import.", style: "width: 69%; display: inline-block"}));
            let b = 0;
            for (b; b < benchmarks.length - 1; b++) {
                totalChance += allKOChanceSets[i][b];
                $("#rolls" + i).append([$("<span>", {text: "Benchmark " + (b + 1) + ": " + allKOChanceSets[i][b].toFixed(2) + "% to KO"}), "<br>"]);
            }
            totalChance += allKOChanceSets[i][b];
            $("#rolls" + i).append($("<span>", {text: "Benchmark " + (b + 1) + ": " + allKOChanceSets[i][b].toFixed(2) + "% to KO"}));
            $("#optimalevsdiv").append($("<label>").append([
                $("<span>", {text: "Total: " + totalChance.toFixed(2) + "%"}),
                "<br><br>"
            ]));
        }
        $(".rollsbtn").click(function () {
            let i = $(this).attr("id").substring(5);
            for (let b = 0; b < benchmarks.length; b++) {
                benchmarks[b][0] = Number(allKOChanceSets[i][b].toFixed(2));
                if (benchmarks[b].length > 5) {
                    if (benchmarks[b][0] < 0.1) {
                        benchmarks[b][0] += 0.1;
                    } else if (benchmarks[b][0] < 0.5) {
                        benchmarks[b][0] *= 2;
                    } else {
                        benchmarks[b][0] += 2.5 * Math.E ** ((-1 * (benchmarks[b][0] - 50) ** 2) / 1400);
                    }
                } else if (benchmarks[b][0] > 0 && benchmarks[b].length > 3) {
                    benchmarks[b][0] += 0.01;
                }
                if (benchmarks[b][0] > 100) {
                    benchmarks[b][0] = 100;
                }
                benchmarks[b][0] = Number(benchmarks[b][0].toFixed(2));
            }
            $("#chanceinput").val(benchmarks[currB][0]);
            $("#chanceinput").change();
        });
    } else {
        optimalEVs.sort(function(a, b) {return a[0] - b[0]});
        optimalEVs = optimalEVs.slice(0, 100);
        for (let i = 0; i < optimalEVs.length; i++) {
            var statstr = "EVs: ";
            var naturestr = benchmarks[0][2][1].nature + " Nature";
            const stats = [[" HP", optimalEVs[i][1].hp], [" Atk", $("#defatkevs").val()], [" Def", optimalEVs[i][1].def], [" SpA", $("#defspaevs").val()], [" SpD", optimalEVs[i][1].spd], [" Spe", $("#defspeevs").val()]];
            let total = 0
            for (let j = 0; j < stats.length; j++) {
                if (stats[j][1] != 0) {
                    statstr += stats[j][1] + stats[j][0] + " / ";
                    total += Number(stats[j][1]);
                }
            }
            if (statstr != "EVs: ") {
                statstr = statstr.slice(0, -3);
            }
            $("#optimalevsdiv").append($("<label>", {id: "evs" + i, class: "evsbtn", title: "Click to copy.", style: "width: 80%; display: inline-block"}).append([
                $("<span>", {text: statstr}),
                $("<br>"),
                $("<span>", {text: naturestr}),
                $("<div>", {text: "Copied", style: "display: inline-block; height: 1em; background-color: rgba(0, 0, 0, 0.7); color: white; border-radius: 5px; padding: 2px 5px 5px; margin: 0px 0px -3px 5px; font-size: 0.9em; visibility: hidden"}),
            ]));
            $("#optimalevsdiv").append($("<label>").append([
                $("<span>", {text: "Total: " + total}),
                "<br><br>"
            ]));
        }
        $(".evsbtn").click(function () {
            let copyevs = $(this).children().eq(0).text() + "\n";
            copyevs += $(this).children().eq(2).text();
            let tooltip = $(this).children().eq(3);
            navigator.clipboard.writeText(copyevs).then(function () {
                tooltip.css({visibility: "visible"});
                setTimeout(function () {
                    tooltip.css({visibility: "hidden"});
                }, 1500);
            });

        });
    }
    $(".rollsbtn, .evsbtn").hover(function (){
        $(this).css({opacity: "0.7"});
    }, function () {
        $(this).css({opacity: "1"});
    });
    time = Date.now() - time;
    console.log(parseInt((time/(1000*60))%60) + " min " + parseInt((time/1000)%60) + " sec " + parseInt((time%1000)) + " millisec");
});

function updateKOChance() {
    let defender = benchmarks[currB][2][1].clone();
    if (editDefEVs) {
        defender.evs.hp = Number($("#defhpevs").val());
        defender.evs.def = Number($("#defdefevs").val());
        defender.evs.spd = Number ($("#defspdevs").val());
    }
    let EVs = defender.evs;
    let tempchance = benchmarks[currB][0];
    benchmarks[currB][0] = 1;
    let kochance = KOChance(benchmarks[currB], EVs, currB);
    benchmarks[currB][0] = tempchance;
    if (benchmarks[currB].length > 5) {
        if (kochance != 0 && kochance != 100) {
            kochance = "~" + kochance.toFixed(2);
        } else {
            kochance = kochance.toFixed(2);
        }
    } else {
        kochance = kochance.toFixed(2);
    }
    $("#kochanceL").text(kochance + "% Chance to KO");
}

function bestRollsHelper(allKOChanceSets, bestKOChances, EVs) {
    let tempchances = new Array(benchmarks.length).fill(100);
    let hasLowChance = false;
    for (let b = 0; b < benchmarks.length; b++) {
        if (benchmarks[b].length > 2) {
            let temp = benchmarks[b][0];
            benchmarks[b][0] = 1;
            tempchances[b] = KOChance(benchmarks[b], EVs, b);
            benchmarks[b][0] = temp;
            if (tempchances[b] < bestKOChances[b]) {
                bestKOChances[b] = tempchances[b];
                hasLowChance = true;
            }
        } else {
            tempchances[b] = 0;
        }
    }
    if (!allKOChanceSets.includes(tempchances)) {
        let temp = JSON.stringify(allKOChanceSets);
        allKOChanceSets = allKOChanceSets.filter(function(a) {
            for (let i = 0; i < a.length; i++) {
                if (tempchances[i] > a[i]) {
                    return true;
                }
            }
            return false;
        });
        if (JSON.stringify(allKOChanceSets) != temp || hasLowChance || allKOChanceSets.length == 0) {
            allKOChanceSets.push(tempchances);
        } else {
            var notworse;
            for (let i = 0; i < allKOChanceSets.length; i++) {
                notworse = false;
                for (let b = 0; b < benchmarks.length; b++) {
                    if (allKOChanceSets[i][b] > tempchances[b]) {
                        notworse = true;
                        break;
                    }
                }
                if (!notworse) {
                    break;
                }
            }
            if (notworse) {
                allKOChanceSets.push(tempchances);
            }
        }
    }
    return allKOChanceSets;
}











