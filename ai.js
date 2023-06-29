// P is the player array determining the AI
function AITest(p,s) {

	this.alertList = "";
    
	// This variable is static, it is not related to each instance.
	this.constructor.count++;

	p.name = "AI Agent " + this.constructor.count;
    var gameOver = this.gameOver;
    var p = player;
    
	// Decide whether to buy a property the AI landed on.
	// Return: boolean (true to buy).
	// Arguments:
	// index: the property's index (0-39).
	this.buyProperty = function(index) {
		console.log("buyProperty");
        if (index < 0 || index >= square.length) {
            console.error('Invalid property index:', index);
            return false;  // Return false immediately
        }
		var s = square[index];
        var p = player[turn];
        console.log(s);console.log(p);
		if (p.money > s.price + 50) {
      console.log("true",p.position);
			return true;
		} else {
			return false;
		}

	}
    

	// Determine the response to an offered trade.
	// Return: boolean/instanceof Trade: a valid Trade object to counter offer (with the AI as the recipient); false to decline; true to accept.
	// Arguments:
	// tradeObj: the proposed trade, an instanceof Trade, has the AI as the recipient.
	this.acceptTrade = function(tradeObj) {
		console.log("acceptTrade was accepted");

		var tradeValue = 0;
		var money = tradeObj.getMoney();
		var initiator = tradeObj.getInitiator();
		var recipient = tradeObj.getRecipient();
		var property = [];
        console.log("tradeValue: "+tradeValue+", money: "+ money, initiator, recipient, property)
		tradeValue += 10 * tradeObj.getCommunityChestJailCard();
		tradeValue += 10 * tradeObj.getChanceJailCard();

		tradeValue += money;

		for (var i = 0; i < 40; i++) {
			property[i] = tradeObj.getProperty(i);
			tradeValue += tradeObj.getProperty(i) * square[i].price * (square[i].mortgage ? 0.5 : 1);
		}

		console.log(tradeValue);

		var proposedMoney = 25 - tradeValue + money;

		if (tradeValue > 25) {
			return true;
		} else if (tradeValue >= -50 && initiator.money > proposedMoney) {

			return new Trade(initiator, recipient, proposedMoney, property, tradeObj.getCommunityChestJailCard(), tradeObj.getChanceJailCard());
		}

		return false;
	}

	// This function is called at the beginning of the AI's turn, before any dice are rolled. The purpose is to allow the AI to manage property and/or initiate trades.
	// Return: boolean: Must return true if and only if the AI proposed a trade.
this.beforeTurn = function() {
    console.log("beforeTurn");
    var s;
    var allGroupOwned;
    var max;
    var leastHouseProperty;
    var leastHouseNumber;

    // Buy houses.
    for (var i = 0; i < 40; i++) {
        s = square[i];

        if (s.owner === p.index && s.groupNumber >= 3) {
            max = s.group.length;
            allGroupOwned = true;
            leastHouseNumber = 6; // No property will ever have 6 houses.

            for (var j = max - 1; j >= 0; j--) {
                if (square[s.group[j]].owner !== p.index) {
                    allGroupOwned = false;
                    break;
                }

                if (square[s.group[j]].house < leastHouseNumber) {
                    leastHouseProperty = square[s.group[j]];
                    leastHouseNumber = leastHouseProperty.house;
                }
            }

            if (!allGroupOwned) {
                continue;
            }

            if (p.money > leastHouseProperty.houseprice + 100) {
                buyHouse(leastHouseProperty.index);
            } else {
                // Not enough money to buy a house, break the loop
                return false;
            }
        }
    }

    // Unmortgage property
    for (var i = 39; i >= 0; i--) {
        s = square[i];

        if (s.owner === p.index && s.mortgage && p.money > s.price) {
            unmortgage(i);
        } else if (s.owner === p.index && s.mortgage && p.money <= s.price) {
            // Not enough money to unmortgage a property, break the loop
            return false;
        }
    }

    return false;
}


	var utilityForRailroadFlag = true; // Don't offer this trade more than once.


	// This function is called every time the AI lands on a square. The purpose is to allow the AI to manage property and/or initiate trades.
	// Return: boolean: Must return true if and only if the AI proposed a trade.
this.onLand = function() {
    console.log("onLand");

    // Initialize an array to represent properties.
    var property = Array(40).fill(0);

    // Define the indexes of railroads on the board.
    var railroadIndexes = [5, 15, 25, 35];

    // Variables to hold the indexes of the railroad requested and utility offered in a trade.
    var requestedRailroad, offeredUtility;

    // If AI owns exactly one utility, try to trade it for a railroad.
    for (var i = 0; i < 4; i++) {
        var s = square[railroadIndexes[i]];

        // If a railroad is owned by someone other than the AI or the bank, request it for trade.
        if (s.owner !== 0 && s.owner !== p.index) {
            requestedRailroad = s.index;
            break;
        }
    }

    // If AI owns a utility and the other utility is owned by someone else, offer it for trade.
    if (square[12].owner === p.index && square[28].owner !== p.index) {
        offeredUtility = 12;
    } else if (square[28].owner === p.index && square[12].owner !== p.index) {
        offeredUtility = 28;
    }

    // If the conditions for a utility-for-railroad trade are met, propose the trade.
    if (utilityForRailroadFlag && game.getDie(1) !== game.getDie(2) && requestedRailroad && offeredUtility) {
        utilityForRailroadFlag = false;
        property[requestedRailroad] = -1; // Requested property is marked with -1.
        property[offeredUtility] = 1; // Offered property is marked with 1.

        // Create a new trade proposal.
        var proposedTrade = new Trade(p, player[square[requestedRailroad].owner], 0, property, 0, 0)

        // Propose the trade in the game.
        game.trade(proposedTrade);
        return true;
    }

    // If no trade was proposed, return false.
    return false;
}


	// Determine whether to post bail/use get out of jail free card (if in possession).
	// Return: boolean: true to post bail/use card.
	this.postBail = function() {
		console.log("postBail");

		// p.jailroll === 2 on third turn in jail.
		if ((p.communityChestJailCard || p.chanceJailCard) && p.jailroll === 2) {
			return true;
		} else {
			return false;
		}
	}

	// Mortgage enough properties to pay debt.
	// Return: void: don't return anything, just call the functions mortgage()/sellhouse()
    this.payDebt = function() {
        console.log("payDebt called. Current money: " + p.money);
        for (var i = 39; i >= 0; i--) {
            s = square[i];
    
            if (s.owner === p.index && !s.mortgage && s.house === 0) {
                console.log("Mortgaging property: " + s.name);
                mortgage(i);
            }
    
            if (p.money >= 0) {
                console.log("Debt paid off. Remaining money: " + p.money);
                return;
            }
        }
    
        console.log("Unable to pay off debt. Remaining money: " + p.money);
    }

    this.bid = function(property, currentBid, bidAmount) {
        console.log("bid: "+ s.price);
        
        if (p.money < bidAmount + 50 || bidAmount > s.price * 1.5) {
            return -1;
        } 
    
        return bidAmount;
    }

    this.chooseAction = async function(statess, stateObj, epsilon) {
        console.log("createStateArray was called with propertyId:", statess.playerPosition);
        console.log("createStateArray was called with stateObj:", stateObj);
        let bidAmount;
        if (Math.random() < epsilon) {
            if (stateObj.type === 'auction') {
                console.log("state.isAction was called");
                bidAmount = Math.random() * stateObj.currentBid;
                return {type: 'bid', bidAmount: bidAmount};
            } else {
                return {type: ACTIONS[Math.floor(Math.random() * ACTIONS.length)]};
            }
        } else {
            if (stateObj.type === 'auction') {
                console.log("else epsilon chooseAction was called");
                let maxQValue = -Infinity;
                for (let bid = 0; bid <= stateObj.currentBid; bid++) {
                    // You'll need to modify this line to create a state array from stateObj
                    //const state = this.createStateArray(stateObj, bid);
                    const state = this.createStateArray(stateObj, bid);
                    console.log(state.length);
                    const qValue = qNetwork.predict(tf.tensor2d([state], [1, state.length]));
                    if (qValue > maxQValue) {
                        maxQValue = qValue;
                        bidAmount = bid;
                    }
                }
                return {type: 'bid', bidAmount: bidAmount};
            } else {
                // You'll need to modify this line to create a state array from stateObj
                const state = statess;
                const qValues = await qNetwork.predict(tf.tensor2d([state], [1, 16]));
                return {type: ACTIONS[qValues.argMax(-1).dataSync()[0]]};
            }
        }
    };
  
    
    this.createStateArray = function(stateObj, bid = 0) {
        // Extract player and square from stateObj
        const { player, square } = stateObj;
    
        // Get the state from the getState function
        let stateArray = getState(player, square);
    
        // Include the bid in the state array only if it doesn't exceed the length
        if (stateArray.length < 16) {
            stateArray.push(bid);
        }
    
        // Ensure the state array has a length of 16
        while (stateArray.length > 16) {
            stateArray.pop();
        }
        while (stateArray.length < 16) {
            stateArray.push(0);
        }
    
        return stateArray;
    };
    
  
  this.performAction = async function(action) {
	if (game.isOver()) {
        console.log("Game has ended. No further actions will be performed.");
        return false;
    }
    try {
        switch (action.type) {
          case "buyProperty":
            return this.buyProperty(action.propertyId);
          case "acceptTrade":
            return this.acceptTrade(action.tradeDetails);
          case "beforeTurn":
            return this.beforeTurn();
          case "onLand":
            return this.onLand();
          case "postBail":
            return this.postBail();
          case "payDebt":
            return this.payDebt();
          case "bid":
            return this.bid(action.propertyId, action.currentBid, action.bidAmount);
          case "END_TURN":
            game.next();
            return true;
          default:
            console.log("Unknown action: " + action.type);
            return false;
        }
      } catch (error) {
        console.error('An error occurred during the performAction call:', error);
      }
}

}
