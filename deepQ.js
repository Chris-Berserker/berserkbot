function getState(player, square) {
  // Extract relevant information from the 'player' variable
  const playerPosition = player.position;
  const playerMoney = player.money / 1500; // Normalize player money
  const playerJail = player.jail ? 1 : 0;
  const playerCommunityChestJailCard = player.communityChestJailCard ? 1 : 0;
  const playerChanceJailCard = player.chanceJailCard ? 1 : 0;

  // Extract relevant information from the 'square' variable
  const squareOwner = square.owner === player.index ? 1 : 0;
  const squareMortgage = square.mortgage ? 1 : 0;
  const squareHouse = square.house;
  const squareHotel = square.hotel;
  const squareRent = [square.baserent, square.rent1, square.rent2, square.rent3, square.rent4, square.rent5];

  // Combine the player and square information into a single state array
  const state = [
      playerPosition,
      playerMoney,
      playerJail,
      playerCommunityChestJailCard,
      playerChanceJailCard,
      squareOwner,
      squareMortgage,
      squareHouse,
      squareHotel,
      ...squareRent
  ];

  return state;
}

         
  
  function getReward(game, action) {
    // Implement this function to return the reward given the state and action
    // For example:
    if (game.isOver() && game.winner() === p.index) {
      return 100; // Reward for winning the game
    } else if (game.isOver()) {
      return -100; // Penalty for losing the game
    } else if (action === 'buyProperty' && p.money < 0) {
      return -50; // Penalty for buying a property and going bankrupt
    } else if (action === 'buyProperty') {
      return 10; // Reward for buying a property
    } else {
      return 0; // Neutral reward for other actions
    }
  }
  
  const ACTIONS = ['buyProperty', 'acceptTrade', 'beforeTurn', 'onLand', 'postBail', 'payDebt', 'bid', 'END_TURN'];

  function createQNetwork() {
    const model = tf.sequential();
    model.add(tf.layers.dense({units: 64, activation: 'relu', inputShape: [15]}));
    model.add(tf.layers.dense({units: 64, activation: 'relu'}));
    model.add(tf.layers.dense({units: ACTIONS.length}));
    model.compile({optimizer: 'adam', loss: 'meanSquaredError'});
    return model;
  }
  
  const qNetwork = createQNetwork();
  
function chooseAction(state, epsilon) {
  console.log("chooseAction was called");
    if (Math.random() < epsilon) {
        // Choose a random action
        if (state.isAuction) {
            // If it's an auction, choose a random bid amount
            console.log("state.isAction was called");
            return {type: 'bid', bidAmount: Math.random() * state.maxBidAmount};
        } else {
            // Otherwise, choose a random action from the ACTIONS array
            return {type: ACTIONS[Math.floor(Math.random() * ACTIONS.length)]};
        }
    } else {
        // Choose the action with the highest Q-value
        if (state.isAuction) {
          console.log("else epsilon chooseAction was called");
            // If it's an auction, choose the bid amount that maximizes the Q-value
            let maxQValue = -Infinity;
            let bestBidAmount = 0;
            for (let bidAmount = 0; bidAmount <= state.maxBidAmount; bidAmount++) {
                const qValue = qNetwork.predict(tf.tensor2d([state.concat([bidAmount])]));
                if (qValue > maxQValue) {
                    maxQValue = qValue;
                    bestBidAmount = bidAmount;
                }
            }
            return {type: 'bid', bidAmount: bestBidAmount};
        } else {
            // Otherwise, choose the action from the ACTIONS array that maximizes the Q-value
            const qValues = qNetwork.predict(tf.tensor2d([state]));
            return {type: ACTIONS[qValues.argMax(-1).dataSync()[0]]};
        }
    }
}



  class ReplayBuffer {
    constructor(capacity) {
      this.capacity = capacity;
      this.buffer = [];
    }
  
    add(experience) {
      console.log("add was called");
      if (this.buffer.length >= this.capacity) {
        this.buffer.shift();
      }
      this.buffer.push(experience);
    }
  
    sample(batchSize) {
      console.log("sample was called");
      const indices = tf.util.shuffle(tf.range(this.buffer.length).arraySync()).slice(0, batchSize);
      const batch = indices.map(i => this.buffer[i]);
      return batch;
    }
  }
  
  const replayBuffer = new ReplayBuffer(10000);

  async function train(game, numEpisodes, batchSize, discountFactor, epsilon) {
    console.log("train was called");
    for (let episode = 0; episode < numEpisodes; episode++) {
      let state = getState(player, square);
      let done = false;
      while (!done) {
        const action = chooseAction(state, epsilon);
        console.log(player);
        console.log(player.AI);
        player.AI.performAction(action); /// You'll need to implement this function to update the game state based on the action
        const reward = getReward(game, action);
        const nextState = getState(player, square);
        replayBuffer.add({state, action, reward, nextState});
        state = nextState;
  
        if (replayBuffer.buffer.length >= batchSize) {
          const batch = replayBuffer.sample(batchSize);
          const states = batch.map(e => e.state);
          const qValues = qNetwork.predict(tf.tensor2d(states));
          const targetQValues = qValues.clone().arraySync();
          for (let i = 0; i < batch.length; i++) {
            const actionIndex = ACTIONS.indexOf(batch[i].action);
            const maxNextQValue = Math.max(...qNetwork.predict(tf.tensor2d([batch[i].nextState])).arraySync()[0]);
            targetQValues[i][actionIndex]= batch[i].reward + discountFactor * maxNextQValue;
          }
          await qNetwork.fit(tf.tensor2d(states), tf.tensor2d(targetQValues), {epochs: 1});
        }
  
        if (game.isOver()) {
          console.log("game reset is to be called");
          done = true;
          game.reset();
        }
      }
    }
  }

  function evaluate(game, numEpisodes) {
    console.log("Evalute was called");
    let totalReward = 0;
    for (let episode = 0; episode < numEpisodes; episode++) {
      let state = getState(player, square);
      let done = false;
      while (!done) {
        const action = chooseAction(state, 0); // Always choose the best action
        player.AI.performAction(action); // You'll need to implement this function to update the game state based on the action
        const reward = getReward(game, action);
        totalReward += reward;
        state = getState(player, square);
        if (game.isOver()) {
          console.log("game reset is to be called");
          done = true;
          game.reset();
        }
      }
    }
    const averageReward = totalReward / numEpisodes;
    console.log(`Average reward: ${averageReward}`);
  }


  