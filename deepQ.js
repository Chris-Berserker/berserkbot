let stateHistory = [];
  function getState(player, square) {
    // Extract relevant information from the 'player' variable
    const playerPosition = player.position;
    console.log(playerPosition);
    const playerMoney = player.money / 1500; // Normalize player money
    const playerJail = player.jail ? 1 : 0;
    const playerCommunityChestJailCard = player.communityChestJailCard ? 1 : 0;
    const playerChanceJailCard = player.chanceJailCard ? 1 : 0;
  
    // Extract relevant information from the 'square' variable
    const squareOwner = square.owner === player.index ? 1 : 0;
    const squareMortgage = square.mortgage ? 1 : 0;
    const squareHouse = square.house;
    const squareHotel = square.hotel ? 1 : 0; // Convert to 1 or 0
    const squareRent = [square.baserent, square.rent1, square.rent2, square.rent3, square.rent4, square.rent5].map(rent => rent / 2000); // Normalize rents
    const squarePrice = square.price / 400; // Normalize square price
  
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
        squarePrice,
        ...squareRent
    ];
    stateHistory.push(state.slice(0, 16));
    return state.slice(0, 16);
  }


function getReward(game, action, p) {
  // Implement this function to return the reward given the state and action
  // For example:
  console.log(p.name);
  console.log(p.money);
  console.log(game.isOver());
  if (game.isOver() && (game.winner() === p.name)) {
    return 100; // Reward for winning the game
  } else if (game.isOver()) {
    return -100; // Penalty for losing the game
  } else if (action === 'buyProperty' && p.money < 0) {
    return -50; // Penalty for buying a property and going bankrupt
  } else if (action === 'bid' && p.money < 0) {
    return -50; // Penalty for bidding a property and going bankrupt
  } else if (action === 'buyProperty') {
    return 20; // Reward for buying a property
  } else if (action === 'bid') {
      return 15; // Reward for bidding a property
    } else {
      return 0; // Neutral reward for other actions
    }
  }
  
  const ACTIONS = ['buyProperty', 'acceptTrade', 'beforeTurn', 'onLand',  'payDebt', 'bid', 'END_TURN'];
  
  function createQNetwork() {
    const model = tf.sequential();
    model.add(tf.layers.dense({units: 64, activation: 'relu', inputShape: [16]}));
    model.add(tf.layers.dense({units: 64, activation: 'relu'}));
    model.add(tf.layers.dense({units: ACTIONS.length}));
    model.compile({optimizer: 'adam', loss: 'meanSquaredError'});
    return model;
  }
  
  const qNetwork = createQNetwork();
  
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
      console.log(this.buffer.length);
      console.log(tf.range(this.buffer.length));
      console.log(tf.range(this.buffer.length).arraySync());
      
      if (this.buffer.length === 0) {
        console.error('Cannot sample from an empty buffer');
        return;
      }
      const indices = Array.from({length: this.buffer.length}, (_, i) => i);
      const shuffledIndices = tf.util.shuffle(indices);
      const batchIndices = shuffledIndices.slice(0, batchSize);
      const batch = batchIndices.map(i => this.buffer[i]);
      return batch;
    }
  }
  
  const replayBuffer = new ReplayBuffer(10000);
  
  async function train(game, numEpisodes, batchSize, discountFactor, epsilon, player, square, bulk) {
    console.log("train was called");
    console.log(player, square);
    for (let episode = 0; episode < numEpisodes; episode++) {
      let state = bulk;
      console.log(state);
      console.log("This is the state from train: "+state);
      let done = false;
      while (!done) {
        console.log('----------');
        console.log(state, epsilon);
        console.log('-----------');
        try {
          const action = await player.AI.chooseAction(state, state, epsilon);
        console.log(player);
        player.AI.performAction(action); /// You'll need to implement this function to update the game state based on the action
        const reward = getReward(game, action, player);
        const nextState = bulk;
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
      } catch (error) {
        console.error('An error occurred during the chooseAction call in the train function:', error);
      }
        
        if (game.isOver()) {
          console.log("game reset is to be called");
          done = true;
          game.reset();

                    
          document.getElementById('training-status').innerText = 
          `Episode ${episode + 1} finished. Total reward: ${totalReward}.`;
          // Add data to chart and update it
          rewardChart.data.labels.push(episode + 1);
          rewardChart.data.datasets[0].data.push(totalReward);
          rewardChart.update();
        }
      }
    }
  }
  
  async function evaluate(game, numEpisodes, player, square) {
    console.log("Evaluate was called");
    let totalReward = 0;
    for (let episode = 0; episode < numEpisodes; episode++) {
      let state = getState(player, square);
      let done = false;
      while (!done) {
        try {
          const action = await player.AI.chooseAction(state, 0); // Always choose the best action
          player.AI.performAction(action); // You'll need to implement this function to update the game state based on the action
          const reward = getReward(game, action, player);
          totalReward += reward;
        } catch (error) {
          console.error('An error occurred during the chooseAction call in the evaluate function:', error);
        }
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
