var FLG_TSURO = 0;
var FLG_KABE = 1;
var FLG_START = 2;
var FLG_GOAL = 3;

var MOVE_PIX = 1.5;

//軌跡フラグ (0:未追加、1:通過済み)
var KISEKI_FLG_OFF = 0;
var KISEKI_FLG_ON  = 1;

//加速度センサの取得間隔(ms)
var TIMER_INTERVAL_MS = 300;

var OFFSET = {
  TOP: 0,
  RIGHT: 1,
  BOTTOM: 2,
  LEFT: 3
};

var KEYCODE = {
  LEFT: 37,
  TOP: 38,
  RIGHT: 39,
  BOTTOM: 40
};

/**
 * セル位置を管理するクラス
 * @param {number} row 行インデックス
 * @param {number} column 列インデックス
 */
var CellPosition = function(row, column) {
  this.row = row;
  this.column = column;
};

/**
 * 現在のセル位置情報をコピーした新しいセル位置情報を取得する
 */
CellPosition.prototype.copy = function() {
  var newInstance = new CellPosition(this.row, this.column);
  return newInstance;
};

/**
 * 現在のセル位置から、指定されたオフセット位置に移動した新しいセル位置情報を取得する
 * @param {number} direction 移動方向
 * @param {number} count 移動マス数
 */
CellPosition.prototype.move = function(direction, count) {
  var moveCellPosition = this.copy();
  var moveCount = 1;
  if (typeof count === "number") {
    moveCount = count; 
  }

  if (direction == OFFSET.TOP) {
    moveCellPosition.row -= moveCount;
  } else if (direction == OFFSET.RIGHT) {
    moveCellPosition.column += moveCount;
  } else if (direction == OFFSET.BOTTOM) {
    moveCellPosition.row += moveCount;
  } else if (direction == OFFSET.LEFT) {
    moveCellPosition.column -= moveCount;
  }
  return moveCellPosition;
};

/*************************************************************************************/

// コンストラクタ
var MeiroCreator = function(canvas) {
  this.C_WIDTH = parseInt(canvas.width, 10);
  this.C_HEIGHT = parseInt(canvas.height, 10);
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  
  //マス数分の２次元配列 (0：通路、1：壁、2:スタート地点、3:ゴール地点)
  this.data = [];

  //通過済みの通路情報を保持する２次元配列
  this.kisekiData = [];

  //ゲームレベル
  this.lvl = 1;
  
  //ボールの現在位置を格納するオブジェクト
  this.boll = { row: 0, column: 0, posX: 0, posY: 0 };
  //ボールの半径
  this.bollRadius = 0;

  //１マスのサイズ(px)
  this.masuSize = 0;
  //１マス(半分)のサイズ(px)
  this.masuSizeMini = 0;
  
  //コントローラの初期化
  this.controller = new GameController(this);

  //加速度センサーが使用可能か (true:使用、false:使用不可)
  this.canUseAccelerometer = navigator.accelerometer !== undefined;
};


// 初期化
MeiroCreator.prototype.init = function() {

  //ゲーム開始中であれば、停止
  this.controller.stop();

  //配列初期化
  var masuCount;
  if (this.lvl == 1) {
    masuCount = 21;
  } else if (this.lvl == 2) {
    masuCount = 31;
  } else if (this.lvl == 3) {
    masuCount = 41;
  } else if (this.lvl == 10) {
    masuCount = 71;
  } else if (this.lvl == 99) {
    masuCount = 101;
  }

  //２次元配列クリア
  this.data.length = 0;
  this.kisekiData.length = 0;

  //マス数分の２次元配列を作成する
  for (var i = 0; i < masuCount; i++) {
    this.kisekiData.push((new Array(masuCount)).fill(KISEKI_FLG_OFF));
    this.data.push((new Array(masuCount)).fill(FLG_TSURO));
  }
  
  //１マスのサイズ(px)を計測する
  this.masuSize = (this.C_HEIGHT * 1.238) / this.rowCount();
  if ((this.C_WIDTH * 1.238)/ this.columnCount() < this.masuSize) {
    this.masuSize = (this.C_WIDTH * 1.238) / this.columnCount();
  }
  this.masuSizeMini = this.masuSize / 2;

  //ボール位置の初期化
  this.boll = { row: 0, column: 0, posX: 0, posY: 0 };

  //ボールの半径
  this.bollRadius = (this.masuSize / 2) - 3 < 3 ? 3 : (this.masuSize / 2) - 3;

  //キャンパスをクリア
  this.clearCanvas();
};

// /**
//  * ゲーム開始
//  */
// MeiroCreator.prototype.start = function() {
//   if (this.isStart !== true) {

//     //スタート地点を探す
//     var isHit = false;
//     for (var i = 0; i < this.rowCount(); i++) {
//       for (var j = 0; j < this.columnCount(); j++) {
//         if (this.cellFlg(i,j) == FLG_START) {
//           isHit = true;
//           this.boll.column = j;
//           this.boll.row = i;
//           this.boll.posX = this.columnToXPoint(j) + (this.getMasuWidth(j) / 2);
//           this.boll.posY = this.rowToYPoint(j) + (this.getMasuWidth(i) / 2);
//           break;
//         }
//       }
//       if (isHit) break;
//     }

//     this.isStart = true;
//     this.draw();
//     this.loopFrame();
//   }
// };

// /**
//  * ゲーム停止
//  */
// MeiroCreator.prototype.stop = function() {
  
//   if (this.isStart) {
//     this.isStart = false;
//     this.loopFrame();
//   }
// };

/**
 * フレームループ
 */
MeiroCreator.prototype.loopFrame = function() {
  
  var self = this;
  
  if (this.controller.isStart !== true) {
    //停止処理
    self.draw();
    return;
  }

  //ループ処理の再帰呼び出し
  requestAnimFrame(function() {
    self.loopFrame();
  });

  //コントローラのイベント処理
  var result = this.controller.doEvent();

  if (result) {
    //描画処理
    self.draw();
  }

}

/**
 * 最小値〜最大値の間で、ランダムな値を取得する
 * @param {number} min 最小値
 * @param {number} max 最大値
 * @return 生成されたランダムな値
 */
MeiroCreator.prototype.random = function(min, max) {
  return Math.floor( Math.random() * (max + 1 - min) ) + min;
}

/**
 * 全セルを指定したフラグで埋める
 */
MeiroCreator.prototype.fillFlg = function(flg) {
  for (var i = 0; i < this.rowCount(); i++) {
    for (var j = 0; j < this.columnCount(); j++) {
      this.setCellFlg(i, j, flg);
    }
  }
}

/**
 * 枠に対してフラグを設定する
 * @param {number} offset 外周にフラグを設定する場合０、内側にフラグを設定する場合、１以上の値を設定
 * @param {number} flg 設定するフラグ
 */
MeiroCreator.prototype.borderFlg = function(offset, flg) {
  for (var i = offset; i < this.rowCount() - offset; i++) {
    for (var j = offset; j < this.columnCount() - offset; j++) {
      if (i == offset || i == this.rowCount() - offset - 1) {
        this.setCellFlg(i, j, flg);
      }
      if (j == offset || j == this.columnCount() - offset - 1) {
        this.setCellFlg(i, j, flg);
      }
    }
  }
}

/**
 * 指定行すべてのセルに、フラグを設定する
 */
MeiroCreator.prototype.setRowFlg = function(row, flg) {
  for (var i = 0; i < this.columnCount(); i++) {
    this.setCellFlg(row, i, flg);
  }
};

/**
 * 指定列すべてのセルに、フラグを設定する
 */
MeiroCreator.prototype.setColumnFlg = function(column, flg) {
  for (var i = 0; i < this.rowCount(); i++) {
    this.setCellFlg(i, column, flg);
  }
};

/**
 * 指定セルに、フラグを設定する
 */
MeiroCreator.prototype.setCellFlg = function(row, column, flg) {
  if (row instanceof CellPosition) {
    //セル位置クラスの場合
    this.data[row.row][row.column] = column;
  } else {
    //行・列インデックス指定の場合
    this.data[row][column] = flg;
  }
};

/**
 * 指定セルのフラグを取得する
 */
MeiroCreator.prototype.cellFlg = function(row, column) {
  if (row instanceof CellPosition) {
    //セル位置クラスの場合
    return this.data[row.row][row.column];
  } else {
    //行・列インデックス指定の場合
    return this.data[row][column];
  }
};

/**
 * 軌跡フラグを取得する
 */
MeiroCreator.prototype.kisekiFlg = function(row, column) {
  if (row instanceof CellPosition) {
    //セル位置クラスの場合
    return this.kisekiData[row.row][row.column];
  } else {
    //行・列インデックス指定の場合
    return this.kisekiData[row][column];
  }
};

/**
 * 指定セルに、軌跡フラグを設定する
 */
MeiroCreator.prototype.setKisekiFlg = function(row, column, flg) {
  if (row instanceof CellPosition) {
    //セル位置クラスの場合
    this.kisekiData[row.row][row.column] = column;
  } else {
    //行・列インデックス指定の場合
    this.kisekiData[row][column] = flg;
  }
};


/**
 * 行のマス数を取得する
 */
MeiroCreator.prototype.rowCount = function() {
  return this.data.length;
};

/**
 * 列のマス数を取得する
 */
MeiroCreator.prototype.columnCount = function() {
  return this.data.length;
};

/**
 * 棒倒し法
 */
MeiroCreator.prototype.bouTaoshi = function() {

  //初期化
  this.init();

  //外枠を壁にする
  this.borderFlg(0, FLG_TSURO);
  this.borderFlg(1, FLG_KABE);

  var cellPos = new CellPosition(0, 0);

  //２行２列置きに、壁を配置し、棒倒しを実施する
  cellPos.row = 3;
  while (cellPos.row < this.rowCount() -2) {

    cellPos.column = 3;
    while (cellPos.column < this.columnCount() - 2) {
      
      //壁設定
      this.setCellFlg(cellPos.row, cellPos.column, FLG_KABE);

      //棒倒し
      var limiter = 0;
      while(limiter < 4) {
        var movePosition = this.random(cellPos.row > 3 ? OFFSET.RIGHT : OFFSET.TOP, OFFSET.LEFT);
        var moveCellPos = cellPos.move(movePosition);
        if (this.cellFlg(moveCellPos.row, moveCellPos.column) == FLG_TSURO) {
          this.setCellFlg(moveCellPos.row, moveCellPos.column, FLG_KABE);
          break;
        }
        limiter++;
      }
      cellPos.column += 2;
    }
    cellPos.row += 2;
  }

  //スタート地点設定
  this.setCellFlg(2, 2, FLG_START);
  //ゴール地点設定
  this.setCellFlg(this.rowCount() - 3, this.columnCount() - 3, FLG_GOAL);

  //画面描画
  this.draw();
};


/**
 * 穴掘り法
 */
MeiroCreator.prototype.anahoriHou = function() {

  //初期化
  this.init();

  //外周を通路にし、中をすべて壁で埋める
  this.fillFlg(FLG_KABE);
  this.borderFlg(0, FLG_TSURO);

  var self = this;

  //初回の穴掘り位置を決定(偶数の位置を設定)
  var startPosition = this.random(2, this.rowCount() - 3);
  startPosition = startPosition + (startPosition % 2);
  startPosition = 2;

  //初回セルの穴掘り
  var cellPos = new CellPosition(startPosition, startPosition);
  var startCellPos = cellPos;
  this.setCellFlg(cellPos, FLG_TSURO);

  //上下左右の進む方向の配列をランダムに作成する無名関数
  var createDirectionList = function() {
    var list = [OFFSET.TOP, OFFSET.RIGHT, OFFSET.BOTTOM, OFFSET.LEFT];
    for (var listIdx = 0; listIdx < list.length; listIdx++) {
      var randomIdx = self.random(0, list.length - 1);
      var tmp = list[listIdx];
      list[listIdx] = list[randomIdx]; 
      list[randomIdx] = tmp;
    }
    return list;
  };

  var cnt = 0;
  var stack = [cellPos];
  
  while (true) {

    //移動方向リストをランダムに作成
    var directionList = createDirectionList();
    var idx = 0;

    while (idx < directionList.length) {

      //２マス先のセル位置作成
      var moveCellPos = cellPos.move(directionList[idx], 2);
      
      //２マス先が壁なら穴掘り
      if (self.cellFlg(moveCellPos) == FLG_KABE) {
  
        this.setCellFlg(cellPos.move(directionList[idx]), FLG_TSURO);
        this.setCellFlg(moveCellPos, FLG_TSURO);
  
        //カレントのセル位置を移動し、移動先セルで再度ランダムに穴掘りを進める
        cellPos = moveCellPos;
        stack.push(cellPos);
        break;        
      }
      idx++;
    }

    //穴掘りが進めなくなった場合、別の位置から再開する
    if (directionList.length == idx) {

      //終了判定
      if (stack.length == 0) break;

      //１つ前の位置に戻って、再度別の方向へ掘り進める
      cellPos = stack.pop();
    }
  }

  //スタート地点
  this.setCellFlg(startCellPos.row, startCellPos.column, FLG_START);

  //ゴール地点
  this.setCellFlg(this.rowCount() - 3, this.columnCount() - 3, FLG_GOAL);

  //結果を画面に描画する
  this.draw();
};

/**
 * キャンパスをクリアする
 */
MeiroCreator.prototype.clearCanvas = function() {
  this.ctx.clearRect(0, 0, this.C_WIDTH, this.C_HEIGHT);
};

/**
 * 画面に描画する
 */
MeiroCreator.prototype.draw = function() {

  console.log("draw!!");

  var fillColorHex = '#FFF'; //背景(通路)の色
  var kabeColorHex = '#333'; //壁の色

  var self = this;
  var ctx = this.ctx;

  //１マスのサイズ(px)
  var masuSize = this.masuSize;
  var masuSizeMini = this.masuSizeMini;

  //背景塗りつぶし
  ctx.fillStyle = fillColorHex;
  ctx.fillRect(0, 0,           //x,y
    (this.columnCount() * masuSize) - (Math.floor(this.columnCount() / 2) * masuSizeMini),  //横幅
    (this.rowCount() * masuSize) - (Math.floor(this.rowCount() / 2) * masuSizeMini)  //縦幅
  );

  //壁を塗る
  var top = 0, left = 0;
  ctx.fillStyle = kabeColorHex;

  //描画する矩形リスト
  var drawRects = [];

  //スタート位置・ゴール位置を保持する変数
  var startRect, goalRect;

  //縦方向のループ
  for (var i = 0; i < this.rowCount(); i++) {
    var height = this.getMasuHeight(i); // 行の高さ
    left = 0;

    //横方向のループ
    for (var j = 0; j < this.columnCount(); j++) {
      var width = this.getMasuWidth(j); //横の幅

      //壁の描画
      if (this.cellFlg(i, j) == FLG_KABE) {
        //drawRects.push({ top: top, left: left, width: width, height: height });
        ctx.fillStyle = kabeColorHex;
        ctx.fillRect(left, top, width, height);
      }

      //通過済み通路の軌跡
      if (this.kisekiFlg(i, j) == KISEKI_FLG_ON) {
        ctx.fillStyle = "#B0C4DE";
        ctx.fillRect(left, top, width, height);
      }

      if (this.cellFlg(i, j) == FLG_GOAL) {
        goalRect = { top: top, left: left, width: width, height: height };
      }

      //横位置を右に移動
      left += width;
    }
    //縦位置を下に下げる
    top += height;
  }

  //描画
  drawRects.forEach(function(rect, index) {
    ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
  });

  if (this.controller.isStart) {
    // //ボールの座標計算
    var bollXPos = this.boll.posX;
    var bollYPos = this.boll.posY;

    this.ctx.fillStyle = '#922';
    ctx.beginPath();
    ctx.arc(bollXPos, 
      bollYPos, 
      this.bollRadius, 
      0, Math.PI*2, false);
    ctx.fill();
  }

  //ゴール地点
  var fontSize = 20 * (1 - (masuSize / (Math.pow(masuSize, 2) - masuSize)));
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.font = Math.floor(fontSize) + "px 'ＭＳ Ｐゴシック'";
  ctx.fillStyle = '#333';
  ctx.fillText("G", 
    goalRect.left + (masuSize / 2), 
    goalRect.top  + (masuSize / 2), masuSize);
};

/**
 * 指定されたセルの行インデックス対応する Y座標を取得
 */
MeiroCreator.prototype.rowToYPoint = function(row) {
  var ypos = Math.floor(row / 2) * this.masuSize;
  ypos += Math.floor((row + 1) / 2) * this.masuSizeMini;
  return ypos;
};

/**
 * 指定されたセルの列インデックス対応する X座標を取得
 */
MeiroCreator.prototype.columnToXPoint = function(column) {
  var xpos = Math.floor(column / 2) * this.masuSize;
  xpos += Math.floor((column + 1) / 2) * this.masuSizeMini;
  return xpos;
};

/**
 * Ｙ座標から行インデックス取得
 */
MeiroCreator.prototype.YPointToRow = function(ypos) {
  var row = (Math.floor(ypos / (this.masuSize + this.masuSizeMini)) * 2);
  if ((ypos % (this.masuSize + this.masuSizeMini)) - this.masuSize >= 0 ) {
    row++;
  }
  return row;
};

/**
 * Ｘ座標から列インデックス取得
 */
MeiroCreator.prototype.XPointToColumn = function(xpos) {
  var col = (Math.floor(xpos / (this.masuSize + this.masuSizeMini)) * 2);
  if ((xpos % (this.masuSize + this.masuSizeMini)) - this.masuSize >= 0 ) {
    col++;
  }
  return col;
};

/**
 * 指定列インデックスのマス幅を取得する
 * @param {number} column
 */
MeiroCreator.prototype.getMasuWidth = function(column) {
  return (column % 2 != 0) ? this.masuSizeMini : this.masuSize;
};

/**
 * 指定列インデックスのマスの高さを取得する
 * @param {number} row
 */
MeiroCreator.prototype.getMasuHeight = function(row) {
  return (row % 2 != 0) ? this.masuSizeMini : this.masuSize;
};

/*************************************************************************************/

// コントローラクラス
var GameController = function(creator) {
  this.creator = creator;
  //ゲーム開始状態かのフラグ (true:開始中、false:停止中)
  this.isStart = false;
  //加速度センサの監視ID
  this.accelerometerWatchId = -1;
  //加速度センサの各座標の加速度
  this.amStartValue = { x : null, y: null, y: null };  //ゲーム開始持の値
  this.amValue = { x : null, y: null, y: null };  //定間隔で取得した値
};

/**
 * 開始処理
 */
GameController.prototype.start = function() {
  
  var cre = this.creator;
  var self = this;

  if (this.isStart !== true) {
    
    //スタート地点を探す
    var isHit = false;
    for (var i = 0; i < cre.rowCount(); i++) {
      for (var j = 0; j < cre.columnCount(); j++) {
        if (cre.cellFlg(i,j) == FLG_START) {
          isHit = true;
          cre.boll.column = j;
          cre.boll.row = i;
          cre.boll.posX = cre.columnToXPoint(j) + (cre.getMasuWidth(j) / 2);
          cre.boll.posY = cre.rowToYPoint(j) + (cre.getMasuHeight(i) / 2);
          break;
        }
      }
      if (isHit) break;
    }

    //加速度センサが使用可能な端末の場合、定間隔で値を取得する
    if (cre.canUseAccelerometer) {
      var options = { frequency: TIMER_INTERVAL_MS };
      this.accelerometerWatchId = 
        navigator.accelerometer.watchAcceleration(
          function(e) {
            self.onAccelerometerSuccess(e);
          }, 
          function() {
            self.onAccelerometerError();
          }, 
          options);
    }

    this.isStart = true;
    cre.draw();
    cre.loopFrame();

  }
};

/**
 * 停止処理
 */
GameController.prototype.stop = function() {
  if (this.isStart) {
    this.isStart = false;
  }
  //加速度センサの情報をクリア
  if (this.accelerometerWatchId !== -1) {
    navigator.accelerometer.clearWatch(this.accelerometerWatchId);
    this.accelerometerWatchId = -1;
  }
  this.amStartValue = { x : null, y: null, y: null };
  this.amValue = { x : null, y: null, y: null };
};

/**
 * 加速度センサの加速度取得成功時の処理
 */
GameController.prototype.onAccelerometerSuccess =  function(acceleration) {

  if (this.amStartValue.x === null) {
    //初回取得値の保存
    //this.amStartValue.x = acceleration.x;
    this.amStartValue.x = 0;
    this.amStartValue.y = 0;
    this.amStartValue.z = acceleration.z;
  }
  //取得時の値を保存
  this.amValue.x = acceleration.x;
  this.amValue.y = acceleration.y;
  this.amValue.z = acceleration.z;
};

/**
 * 加速度センサの加速度取得成功時の処理
 */
GameController.prototype.onAccelerometerError =  function() {
  console.error("error onAccelerometerError!!");
};

/**
 * アニメーションループからよばれる、イベント処理メソッド
 * 入力状態に応じてりゲーム動作を行う
 */
GameController.prototype.doEvent = function() {

  var speedX = 0;
  var speedY = 0;

  /**************************************/
  // X軸の移動方向、移動速度を計算
  /**************************************/
  if (this.creator.canUseAccelerometer) {
    //加速度センサがオンの場合
    if ( Math.abs(this.amValue.x) > 1 ) {
      speedX = (this.amValue.x - this.amStartValue.x) * TIMER_INTERVAL_MS;
    }
  } else {
    //キーボード入力
    if (input_key_buffer[KEYCODE.LEFT] === true) {
      speedX = 1000;
    } else if (input_key_buffer[KEYCODE.RIGHT] === true) {
      speedX = -1000;
    }
  }

  //X軸の移動ピクセル数
  var moveX = (-1 * speedX) / 1000;
  $("#AX").text(moveX);

  /**************************************/
  // Y軸の移動方向、移動速度を計算
  /**************************************/
  if (this.creator.canUseAccelerometer) {
    //加速度センサがオンの場合
    if ( Math.abs(this.amValue.y) > 1 ) {
      speedY = (this.amValue.y - this.amStartValue.y) * TIMER_INTERVAL_MS;
    }
  } else {
    //キーボード入力
    if (input_key_buffer[KEYCODE.TOP] === true) {
      speedY = -1000;
    } else if (input_key_buffer[KEYCODE.BOTTOM] === true) {
      speedY = 1000;
    }
  }

  //Y軸の移動ピクセル数
  var moveY = speedY / 1000;

  /**************************************/
  // 移動
  /**************************************/
  if (moveX != 0 || moveY != 0) {
    return this.move(moveX, moveY);
  } else {
    return false;
  }

  return false;
};

/**
 * ボールを移動する
 * @param {number} moveX X軸への移動ピクセル数
 * @param {number} moveY Y軸への移動ピクセル数
 * @return ボールの移動が出来た場合 true。
 */
GameController.prototype.move = function(moveX, moveY) {

  //指定方向に移動可能かチェック
  if (!this.canMove(moveX, moveY)) {
   return;
  }

  //var movePix = MOVE_PIX;
  var cre = this.creator;

  //指定方向へ移動
  cre.boll.posX += moveX;
  cre.boll.posY += moveY;

  //現在のセル位置を退避
  var column = cre.boll.column;
  var row = cre.boll.row;

  //移動先セルの行・列インデックスを設定
  cre.boll.column = cre.XPointToColumn(cre.boll.posX);
  cre.boll.row = cre.YPointToRow(cre.boll.posY); 

  //セル位置が変わったら、移動前セルを通過済みに設定する
  if (column != cre.boll.column || row != cre.boll.row) {
    cre.setKisekiFlg(row, column, KISEKI_FLG_ON);
  }

  //ボールの移動を行った場合、true を返却
  return moveX != 0 || moveY != 0;
}

/**
 * 指定方向移動可能かをチェックし、結果を取得する
 * @param {number} moveX X軸への移動ピクセル数
 * @param {number} moveY Y軸への移動ピクセル数
 * @return ボールの移動が出来る場合 true。
 */
GameController.prototype.canMove = function(moveX, moveY) {
  var cre = this.creator;
  
  //指定方向へ移動後の座標を計算
  var posX = cre.boll.posX + moveX;
  var posY = cre.boll.posY + moveY;

  //移動後の行・列インデックスを設定
  var row = cre.YPointToRow(posY + 
    ( moveY > 0 ? cre.bollRadius : moveY == 0 ? 0 : (-1) * cre.bollRadius));
  var column = cre.XPointToColumn(posX + 
    ( moveX > 0 ? cre.bollRadius : moveX == 0 ? 0 : (-1) * cre.bollRadius));

  //移動後セルのフラグを取得
  var flg = cre.cellFlg(row, column);

  $("#DEBUG").text("row=" + row + ", column=" + column);

  return flg != FLG_KABE;
};


/*************************************************************************************/

var creator;

/**
 * 作成
 * @param {number} lvl 
 */
function create(lvl) {
  creator.lvl = lvl;
  if ($("#bou").is(":checked")) {
    creator.bouTaoshi();
  } else if ($("#kabeHori").is(":checked")) {
    creator.anahoriHou();
  }
}

/**
 * start
 */
function startGame() {
  creator.controller.start();
}

/**
 * stop
 */
function stopGame() {
  creator.controller.stop();
}

/**
 * 描画ループ
 */
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();

// キーボードの入力状態を記録する配列
var input_key_buffer = new Array();

$(function() {
  
  // ------------------------------------------------------------
  // キーボードを押したときに実行されるイベント
  // ------------------------------------------------------------
  document.onkeydown = function (e){
    if(!e) e = window.event; // レガシー

    input_key_buffer[e.keyCode] = true;
  };

  // ------------------------------------------------------------
  // キーボードを離したときに実行されるイベント
  // ------------------------------------------------------------
  document.onkeyup = function (e){
    if(!e) e = window.event; // レガシー

    input_key_buffer[e.keyCode] = false;
  };

});

