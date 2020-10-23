// Basisdaten festlegen (kann vermutlich später auch über auslesen der Charakterwerte gemacht werden)
let BAB = 15;
let oAttackBonus = 9;
let bDmgBonus = 6;
let cRange = 19;
let cMulti = 3;

// Inhalt des Dialogs zum Erfragen der Details für die Fullattack
let dialogTemplate = `
                    <h1> Eigenschaften festlegen: </h1>
                    <div style="display:flex; flex-direction: column">
                    <span style="flex:1">Bonus Attack Modifier: <input  id="bonusAttackMod" type="number" style="width:50px" value=0 /></span>
                    <span style="flex:1">Bonus Damage: <input  id="bonusDmg" type="number" style="width:50px" value=0 /></span>
                    <span style="flex:1">Bonus Attacks: <input  id="bonusAttacks" type="number" style="width:30px" value=0 /></span>
                    <span style="flex:1">Manyshot? <input id="bolMS" type="checkbox" checked /></span>
                    <span style="flex:1">Gravity Bow?<input id="bolGB" type="checkbox" unchecked /></span>
                    <span style="flex:1">Gesamtschaden anzeigen? <input id="bolGS" type="checkbox" checked /></span>
                    </div>
                    `

// Dialog erzeugen und Attacken auswürfeln
new Dialog({
    title: "Fullattack ausführen",
    content: dialogTemplate,
    buttons: {
        submit: {
            label: "Angriff auswürfeln",
            callback: (html) => {
                // Inhalte des Dialogs auslesen
                let bonusAttackMod = parseInt(html.find("#bonusAttackMod")[0].value);
                let bonusDmg = parseInt(html.find("#bonusDmg")[0].value);
                let bonusAttacks = parseInt(html.find("#bonusAttacks")[0].value);
                let bolMS = html.find("#bolMS")[0].checked;
                let bolGB = html.find("#bolGB")[0].checked;
                let bolGS = html.find("#bolGS")[0].checked;
                // Aktuellen Charakter auslesen
                let selected = canvas.tokens.controlled;
                let selected_actor = selected[0].actor;
                // Start der Attacke im Chat anzeigen
                ChatMessage.create({
                    speaker: {
                        alias: selected_actor.name
                    },
                    content: `== Neue Fullattack==`,
                })
                // Attacke auswürfeln
                fullAttack(BAB, bonusAttackMod, bonusDmg, oAttackBonus, bDmgBonus, bolMS, bolGB, cRange, cMulti, bonusAttacks, bolGS)
            },
        },
    },
}).render(true);

// Funktion um die vollständige Attacke auszuwürfeln
function fullAttack(baseAttackBonus, tempAttackBonus, tempDmgBonus, otherAttackBonus, baseDmgBonus, bolMS, bolGB, critRange, critMulti, bonusAttacks, bolShowDmg) {
    let totalAttackDmg = 0;
    // Bonusangriffe mit vollem BAB auswürfeln (Hast, Rapid Shot etc.)
    if (bonusAttacks >= 1) {
        var tempBonusAttack;
        for (tempBonusAttack = 1; tempBonusAttack <= bonusAttacks; tempBonusAttack++) {
            totalAttackDmg = totalAttackDmg + attackRoll(baseAttackBonus, tempAttackBonus, tempDmgBonus, otherAttackBonus, baseDmgBonus, false, bolGB, critRange, critMulti, `Bonus ${tempBonusAttack}`)
        }
    }
    // Normale Attacken auf Basis der BAB auswürfeln
    let normalAttackNr = 1;
    while (baseAttackBonus > 0) {
        if (normalAttackNr == 1) {
            totalAttackDmg = totalAttackDmg + attackRoll(baseAttackBonus, tempAttackBonus, tempDmgBonus, otherAttackBonus, baseDmgBonus, bolMS, bolGB, critRange, critMulti, normalAttackNr)
        } else {
            totalAttackDmg = totalAttackDmg + attackRoll(baseAttackBonus, tempAttackBonus, tempDmgBonus, otherAttackBonus, baseDmgBonus, false, bolGB, critRange, critMulti, normalAttackNr)
        }
        baseAttackBonus = baseAttackBonus - 5;
        normalAttackNr++;
    }
    // Wenn im Dialog ausgewählt: Gesamtschaden in neuem Dialog anzeigen
    if (bolShowDmg == true) {
        new Dialog({
            title: "Gesamtschaden",
            content: `
            <p> Total Damage: ${totalAttackDmg} </p>
            `,
            buttons: {
                submit: {
                    label: "Close",
                },
            },
        }).render(true);
    }
}



// Funktion zum auswürfeln der einzelnen Attacken
function attackRoll(baseAttackBonus, tempAttackBonus, tempDmgBonus, otherAttackBonus, baseDmgBonus, bolMS, bolGB, critRange, critMulti, attackNumber) {
    // Aktuellen Spieler auswählen -> hier gibt es ggf. bessere Lösung
    let selected = canvas.tokens.controlled;
    let selected_actor = selected[0].actor;
    // Summe des Attack und Dmg Bonus ermitteln
    let attackBonus = baseAttackBonus + tempAttackBonus + otherAttackBonus;
    let dmgBonus = tempDmgBonus + baseDmgBonus;
    // String für Attackroll definieren
    let attackRollString = `1d20+${attackBonus}`;
    // Summe des Gesamtschadens initialisieren
    let totalDmg = 0;
    // Die für Attackroll erzeugen und würfeln
    let attackRollDie = new Roll(attackRollString);
    attackRollDie.roll()
    // Wert ohne Attackbonus ermitteltn um Crit und FUmble zu erkennen
    let dieResult = attackRollDie.total - attackBonus;

    let rollDmg = false;
    let crit = false;
    // Roll für Fumble durchführen
    if (dieResult == 1) {
        //  FUMBLE
        attackRollDie.toMessage({
            speaker: {
                alias: selected_actor.name
            }, flavor: `Possible Fumble on Attack ${attackNumber}:`
        });
        let fumbelRollDie = new Roll(attackRollString);
        fumbelRollDie.toMessage({
            speaker: {
                alias: selected_actor.name
            }, flavor: `Fumble Confirmation:`
        });
    // Roll für Wurf in Crit Range durchführen
    } else if (dieResult >= critRange && dieResult != 20) {
        //  Crit
        attackRollDie.toMessage({
            speaker: {
                alias: selected_actor.name
            }, flavor: `Possible Critical Hit on Attack ${attackNumber}:`
        });
        let critRollDie = new Roll(attackRollString);
        critRollDie.toMessage({
            speaker: {
                alias: selected_actor.name
            }, flavor: `Critical Hit Confirmation:`
        });
        rollDmg = true;
        crit = true;
    // Roll nat. 20 ausführen
    } else if (dieResult == 20) {
        //  Natural Crit
        attackRollDie.toMessage({
            speaker: {
                alias: selected_actor.name
            }, flavor: `Natural Critical Hit on Attack ${attackNumber}:`
        });
        let critRollDie = new Roll(attackRollString);
        critRollDie.toMessage({
            speaker: {
                alias: selected_actor.name
            }, flavor: `Critical Hit Confirmation:`
        });
        rollDmg = true;
        crit = true;
    // normale Attack auswürfeln
    } else {
        //  Hit?
        attackRollDie.toMessage({
            speaker: {
                alias: selected_actor.name
            }, flavor: `Normal Hit on Attack ${attackNumber}:`
        });
        rollDmg = true;
    }
    //Gravity Bow Berücksichtigen
    let baseDmgDie = '1d8';
    if (bolGB == true) {
        baseDmgDie = '2d6';
    }
    let dmgRollString = `${baseDmgDie}+${dmgBonus}`;
    if (bolMS == true) {
        dmgRollString = `2*(${baseDmgDie}+${dmgBonus})`;
    }
    // Dmg auswürfeln
    if (rollDmg == true) {
        if (crit == true) {
            var attackNr;
            for (attackNr = 1; attackNr <= critMulti; attackNr++) {
                let dmgRollDie = new Roll(dmgRollString);
                dmgRollDie.toMessage({
                    speaker: {
                        alias: selected_actor.name
                    }, flavor: `Damage for Attack ${attackNumber} (Crit Dmg Roll ${attackNr} of ${critMulti}):`
                });
                totalDmg = totalDmg + dmgRollDie.total
            }
        } else {
            let dmgRollDie = new Roll(dmgRollString);
            dmgRollDie.toMessage({
                speaker: {
                    alias: selected_actor.name
                }, flavor: `Damage for Attack ${attackNumber}:`
            });
            totalDmg = totalDmg + dmgRollDie.total
        }
    }
    return totalDmg;
}