/* ===== 游戏配置 ===== */
const CONFIG = {
  INITIAL_TIME: 90,          // 初始时间（秒）
  INITIAL_LIVES: 3,          // 初始生命
  MAX_ORDERS: 4,             // 最大订单数
  PATIENCE_TIME: 35 * 1000,  // 顾客耐心时间（毫秒）
  INGREDIENT_STOCK: 10,      // 每种食材初始库存
  FIRE_DECAY_RATE: 0.25,     // 火焰衰减速度
  COMBO_TIMEOUT: 5000,       // 连击超时时间（毫秒）
  SCORE_BASE: 100,           // 基础得分
  SCORE_COMBO_MULTIPLIER: 1.5 // 连击倍率
};

/* ===== 音效系统 ===== */
class SoundManager {
  constructor() {
    this.audioCtx = new (AudioContext || webkitAudioContext)();
    this.muted = false;
  }

  play(frequency, duration, volume = 0.05, type = 'sine') {
    if (this.muted) return null;
    
    try {
      const oscillator = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      gainNode.gain.value = volume;
      
      const now = this.audioCtx.currentTime;
      gainNode.gain.setValueAtTime(volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration / 1000);
      
      oscillator.start(now);
      oscillator.stop(now + duration / 1000);
      
      return oscillator;
    } catch (error) {
      console.warn('音效播放失败:', error);
      return null;
    }
  }

  success() {
    this.play(1000, 150, 0.08);
    setTimeout(() => this.play(1400, 150, 0.08), 150);
    setTimeout(() => this.play(1800, 100, 0.05), 300);
  }

  fail() {
    this.play(300, 400, 0.1);
    setTimeout(() => this.play(250, 300, 0.08), 100);
  }

  chop() {
    this.play(1200, 80, 0.06);
  }

  warning() {
    this.play(800, 200, 0.07, 'square');
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}

/* ===== 游戏数据 ===== */
const RECIPES = {
  // 猎奇菜谱
  "爆炒蜘蛛腿": ["蜘蛛🕷️", "辣椒🌶️", "大蒜🧄"],
  "炭烤蝎子串": ["蝎子🦂", "洋葱🧅", "辣椒🌶️"],
  "蜗牛刺身": ["蜗牛🐌", "香菜🥬", "大蒜🧄"],
  "油炸蚂蚱": ["蚂蚱🦗", "土豆🥔", "辣椒🌶️"],
  "章鱼烧": ["章鱼🐙", "洋葱🧅", "番茄🍅"],
  "蚯蚓沙拉": ["蚯蚓🪱", "香菜🥬", "番茄🍅"],
  "鸟蛋蒸珊瑚": ["鸟蛋🪺", "珊瑚🪸", "大蒜🧄"],
  "地狱海鲜锅": ["章鱼🐙", "蝎子🦂", "蜘蛛🕷️"],
  "昆虫拼盘": ["蚂蚱🦗", "蜘蛛🕷️", "蝎子🦂"],
  "珊瑚炖蜗牛": ["珊瑚🪸", "蜗牛🐌", "洋葱🧅"],
  "蚯蚓炒蛋": ["蚯蚓🪱", "鸟蛋🪺", "大蒜🧄"],
  "深海恐惧": ["章鱼🐙", "珊瑚🪸", "蜘蛛🕷️"],
  "暗黑料理": ["蚂蚱🦗", "蚯蚓🪱", "蝎子🦂"],
  "奇珍异兽煲": ["蜗牛🐌", "蜘蛛🕷️", "鸟蛋🪺"],
  "地狱全席": ["章鱼🐙", "蝎子🦂", "蜗牛🐌", "蜘蛛🕷️"]
};

const INGREDIENTS = [
  "章鱼🐙", "蜗牛🐌", "蚂蚱🦗", "蜘蛛🕷️", 
  "蝎子🦂", "鸟蛋🪺", "珊瑚🪸", "蚯蚓🪱",
  "牛肉🥩", "鸡肉🐔", "鱼肉🐟", "土豆🥔",
  "番茄🍅", "洋葱🧅", "大蒜🧄", "辣椒🌶️",
  "香菜🥬"
];

const CUSTOMER_EMOJIS = ["😈", "👹", "👺", "💀", "👻", "👽", "🤖", "🎃", "🦇", "🕸️"];

/* ===== 游戏核心类 ===== */
class HellKitchenGame {
  constructor() {
    this.sound = new SoundManager();
    this.state = {
      time: CONFIG.INITIAL_TIME,
      lives: CONFIG.INITIAL_LIVES,
      score: 0,
      combo: 0,
      comboTimer: null,
      running: true,
      selected: [],
      fire: 100,
      burnt: false,
      stocks: {},
      orders: [],
      orderId: 0
    };
    
    this.dom = {
      time: document.getElementById('time'),
      combo: document.getElementById('combo'),
      score: document.getElementById('score'),
      lives: document.getElementById('lives'),
      ingredients: document.getElementById('ingredients'),
      pot: document.getElementById('pot'),
      fireBar: document.getElementById('fireBar'),
      orders: document.getElementById('orders'),
      recipeGrid: document.getElementById('recipeGrid'),
      gameOver: document.getElementById('gameOver'),
      overText: document.getElementById('overText'),
      addFire: document.getElementById('addFire'),
      serveBtn: document.getElementById('serveBtn'),
      resetBtn: document.getElementById('resetBtn')
    };
    
    this.init();
  }

  init() {
    // 初始化库存
    this.state.stocks = Object.fromEntries(
      INGREDIENTS.map(item => [item, CONFIG.INGREDIENT_STOCK])
    );
    
    this.renderIngredients();
    this.renderRecipes();
    this.attachEventListeners();
    this.generateOrder();
    this.startGameLoop();
    this.startCountdown();
  }

  renderIngredients() {
    this.dom.ingredients.innerHTML = INGREDIENTS.map(name => `
      <div class="ingredient" data-name="${name}" title="点击添加">
        <span class="knife"></span>
        <div>${name}</div>
        <div class="stock">库存: ${this.state.stocks[name]}</div>
      </div>
    `).join('');
  }

  renderRecipes() {
    this.dom.recipeGrid.innerHTML = Object.entries(RECIPES).map(([name, list]) => `
      <div class="recipe-item" title="${name}">
        <div>${name}</div>
        <div>${list.join(' + ')}</div>
      </div>
    `).join('');
  }

  attachEventListeners() {
    // 食材点击
    this.dom.ingredients.addEventListener('click', (e) => {
      if (!this.state.running) return;
      
      const card = e.target.closest('.ingredient');
      if (!card || card.classList.contains('sold-out')) return;
      
      const name = card.dataset.name;
      if (this.state.stocks[name] <= 0) return;
      
      this.addIngredient(card, name);
    });

    // 按钮事件
    this.dom.addFire.onclick = () => {
      if (!this.state.running) return;
      this.state.fire = Math.min(100, this.state.fire + 25);
      this.updateFireDisplay();
    };

    this.dom.serveBtn.onclick = () => this.serveDish();
    this.dom.resetBtn.onclick = () => this.resetPot();
  }

  addIngredient(card, name) {
    this.sound.chop();
    card.classList.add('chopping');
    
    setTimeout(() => {
      card.classList.remove('chopping');
      this.state.stocks[name]--;
      this.state.selected.push(name);
      
      // 更新显示
      card.querySelector('.stock').textContent = `库存: ${this.state.stocks[name]}`;
      if (this.state.stocks[name] === 0) {
        card.classList.add('sold-out');
      }
      
      this.updatePot();
    }, 500);
  }

  updatePot() {
    this.dom.pot.textContent = this.state.selected.length 
      ? this.state.selected.join(' + ')
      : '选择食材';
  }

  resetPot() {
    this.state.selected = [];
    this.updatePot();
  }

  updateFireDisplay() {
    this.dom.fireBar.style.width = `${this.state.fire}%`;
  }

  fireLoop() {
    if (!this.state.running) return;
    
    this.state.fire -= CONFIG.FIRE_DECAY_RATE;
    if (this.state.fire <= 0) {
      this.state.fire = 0;
      this.state.burnt = true;
      this.dom.pot.classList.add('burnt');
    }
    
    this.updateFireDisplay();
  }

  generateOrder() {
    if (this.state.orders.length >= CONFIG.MAX_ORDERS || !this.state.running) return;
    
    const recipeNames = Object.keys(RECIPES);
    const name = recipeNames[Math.floor(Math.random() * recipeNames.length)];
    const id = this.state.orderId++;
    
    const order = {
      id,
      name,
      list: RECIPES[name],
      emoji: CUSTOMER_EMOJIS[Math.floor(Math.random() * CUSTOMER_EMOJIS.length)],
      patience: CONFIG.PATIENCE_TIME,
      startTime: Date.now()
    };
    
    this.state.orders.push(order);
    this.renderOrders();
    
    // 每生成一个新订单，有30%几率再生成一个
    if (Math.random() < 0.3 && this.state.orders.length < CONFIG.MAX_ORDERS) {
      setTimeout(() => this.generateOrder(), 1000);
    }
  }

  renderOrders() {
    this.dom.orders.innerHTML = this.state.orders.map(order => `
      <div class="order-item" id="order-${order.id}">
        <div class="order-top">
          <span>${order.emoji}</span>
          <span>${order.name}</span>
        </div>
        <div class="order-text">${order.list.join(' + ')}</div>
        <div class="patience-bar">
          <div class="patience-inner" id="pat-${order.id}"></div>
        </div>
      </div>
    `).join('');
  }

  updatePatience() {
    const now = Date.now();
    
    this.state.orders.forEach(order => {
      const elapsed = now - order.startTime;
      const remaining = Math.max(0, order.patience - elapsed);
      const percentage = (remaining / order.patience) * 100;
      
      const bar = document.getElementById(`pat-${order.id}`);
      if (bar) {
        bar.style.width = `${percentage}%`;
        
        // 警告效果
        if (percentage < 20) {
          bar.style.background = 'linear-gradient(90deg, var(--yellow), var(--red))';
          if (Math.random() < 0.1) this.sound.warning();
        }
      }
      
      if (remaining === 0) {
        this.failOrder(order);
      }
    });
  }

  failOrder(order) {
    this.state.orders = this.state.orders.filter(o => o.id !== order.id);
    this.state.lives--;
    this.dom.lives.textContent = this.state.lives;
    
    this.sound.fail();
    this.resetCombo();
    
    this.renderOrders();
    this.generateOrder();
    
    if (this.state.lives <= 0) {
      this.gameOver();
    }
  }

  serveDish() {
    if (!this.state.selected.length || !this.state.running) return;
    
    if (this.state.burnt) {
      this.resetPot();
      this.state.burnt = false;
      this.dom.pot.classList.remove('burnt');
      this.sound.fail();
      return;
    }
    
    let orderServed = null;
    
    for (const order of this.state.orders) {
      if (this.arraysEqual(this.state.selected, order.list)) {
        orderServed = order;
        break;
      }
    }
    
    if (orderServed) {
      this.successOrder(orderServed);
    } else {
      this.incorrectOrder();
    }
    
    this.resetPot();
  }

  successOrder(order) {
    this.state.orders = this.state.orders.filter(o => o.id !== order.id);
    
    // 连击系统
    this.state.combo++;
    clearTimeout(this.state.comboTimer);
    this.state.comboTimer = setTimeout(() => {
      this.state.combo = 0;
      this.dom.combo.textContent = this.state.combo;
    }, CONFIG.COMBO_TIMEOUT);
    
    // 得分计算
    const comboMultiplier = 1 + (this.state.combo - 1) * 0.5;
    const scoreEarned = Math.floor(CONFIG.SCORE_BASE * comboMultiplier);
    this.state.score += scoreEarned;
    
    // 更新显示
    this.dom.score.textContent = this.state.score;
    this.dom.combo.textContent = this.state.combo;
    
    this.sound.success();
    this.renderOrders();
    this.generateOrder();
  }

  incorrectOrder() {
    this.sound.fail();
    this.resetCombo();
    
    this.state.lives--;
    this.dom.lives.textContent = this.state.lives;
    
    if (this.state.lives <= 0) {
      this.gameOver();
    }
  }

  resetCombo() {
    this.state.combo = 0;
    this.dom.combo.textContent = this.state.combo;
    clearTimeout(this.state.comboTimer);
  }

  arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    return [...arr1].sort().join() === [...arr2].sort().join();
  }

  startGameLoop() {
    const gameLoop = () => {
      this.fireLoop();
      this.updatePatience();
      
      if (this.state.running) {
        requestAnimationFrame(gameLoop);
      }
    };
    
    gameLoop();
  }

  startCountdown() {
    const countdown = () => {
      if (!this.state.running) return;
      
      this.state.time--;
      this.dom.time.textContent = this.state.time;
      
      if (this.state.time <= 10) {
        this.dom.time.style.color = 'var(--red)';
        this.dom.time.style.animation = 'blink 1s infinite';
      }
      
      if (this.state.time <= 0) {
        this.gameOver();
      } else {
        setTimeout(countdown, 1000);
      }
    };
    
    countdown();
  }

  gameOver() {
    this.state.running = false;
    
    let message = '';
    if (this.state.score >= 5000) {
      message = `地狱厨神诞生！得分: ${this.state.score}`;
    } else if (this.state.score >= 3000) {
      message = `优秀表现！得分: ${this.state.score}`;
    } else if (this.state.score >= 1000) {
      message = `游戏结束！得分: ${this.state.score}`;
    } else {
      message = `还需练习...得分: ${this.state.score}`;
    }
    
    this.dom.overText.textContent = message;
    this.dom.gameOver.style.display = 'flex';
    
    // 播放最终音效
    if (this.state.score > 0) {
      this.sound.success();
    } else {
      this.sound.fail();
    }
  }
}

/* ===== 添加CSS动画 ===== */
const style = document.createElement('style');
style.textContent = `
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  
  .high-score {
    animation: pulse 0.5s ease-in-out;
  }
`;
document.head.appendChild(style);

/* ===== 游戏启动 ===== */
// 等待DOM加载完成后启动游戏
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.game = new HellKitchenGame();
  });
} else {
  window.game = new HellKitchenGame();
}

/* ===== 添加键盘快捷键 ===== */
document.addEventListener('keydown', (e) => {
  if (!window.game) return;
  
  switch(e.key.toLowerCase()) {
    case ' ':
      e.preventDefault();
      window.game.serveDish();
      break;
    case 'r':
      window.game.resetPot();
      break;
    case 'f':
      window.game.state.fire = Math.min(100, window.game.state.fire + 25);
      window.game.updateFireDisplay();
      break;
    case 'm':
      const muted = window.game.sound.toggleMute();
      console.log(muted ? '🔇 静音' : '🔊 开启声音');
      break;
  }
});