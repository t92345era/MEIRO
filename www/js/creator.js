var FLG_TSURO = 0;
var FLG_KABE = 1;
var FLG_START = 2;
var FLG_GOAL = 3;

var OFFSET = {
  TOP: 0,
  RIGHT: 1,
  BOTTOM: 2,
  LEFT: 3
};

/**
 * セル位置を管理するクラス
 * @param {number} row 行インデックス
 * @param {number} column 列インデックス
 */
var CellPosition = function(row, column) {
  this.row = row;
  this.column = column;
}

/**
 * 現在のセル位置情報をコピーした新しいセル位置情報を取得する
 */
CellPosition.prototype.copy = function() {
  var newInstance = new CellPosition(this.row, this.column);
  return newInstance;
};

/**
 * 現在のセル位置から、指定されたオフセット位置に移動した新しいセル位置情報を取得する
 * @param {number} offset 移動方向
 * @param {number} count 移動マス数
 */
CellPosition.prototype.move = function(offset, count) {
  var moveCellPosition = this.copy();
  var moveCount = 1;
  if (typeof count === "number") {
    moveCount = count; 
  }

  if (offset == OFFSET.TOP) {
    moveCellPosition.row -= moveCount;
  } else if (offset == OFFSET.RIGHT) {
    moveCellPosition.column += moveCount;
  } else if (offset == OFFSET.BOTTOM) {
    moveCellPosition.row += moveCount;
  } else if (offset == OFFSET.LEFT) {
    moveCellPosition.column -= moveCount;
  }
  return moveCellPosition;
};

var MeiroCreator = function(canvas) {
  this.C_WIDTH = parseInt(canvas.width, 10);
  this.C_HEIGHT = parseInt(canvas.height, 10);
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.isStart = false;
  
  //マス数分の２次元配列 (0：通路、1：壁)
  this.data = [];
  this.lvl = 1;
};

// 初期化
MeiroCreator.prototype.init = function() {

  //配列初期化
  var masuCount;
  if (this.lvl == 1) {
    masuCount = 21;
  } else if (this.lvl == 2) {
    masuCount = 31;
  } else if (this.lvl == 3) {
    masuCount = 41;
  } else if (this.lvl == 10) {
    masuCount = 91;
  } else if (this.lvl == 99) {
    masuCount = 201;
  }

  //２次元配列クリア
  this.data.length = 0;

  //マス数分の２次元配列を作成する (0：通路、1：壁)
  for (var i = 0; i < masuCount; i++) {
    var columns = [];
    for (var j = 0; j < masuCount; j++) {
      columns.push(FLG_TSURO);
    }
    this.data.push(columns);
  }

  //キャンパスをクリア
  this.clearCanvas();
};

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

  var self = this;
  var ctx = this.ctx;

  //１マスのサイズ(px)
  var masuSize = (this.C_HEIGHT * 1.238) / this.rowCount();
  var masuSizeMini;
  if ((this.C_WIDTH * 1.238)/ this.columnCount() < masuSize) {
    masuSize = (this.C_WIDTH * 1.238) / this.columnCount();
  }
  masuSizeMini = masuSize / 2;

  //背景塗りつぶし
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0,           //x,y
    (this.columnCount() * masuSize) - (Math.floor(this.columnCount() / 2) * masuSizeMini),  //横幅
    (this.rowCount() * masuSize) - (Math.floor(this.rowCount() / 2) * masuSizeMini)  //縦幅
  );

  //壁を塗る
  var top = 0, left = 0;
  ctx.fillStyle = '#333';

  //描画する矩形リスト
  var drawRects = [];

  //スタート位置・ゴール位置を保持する変数
  var startRect, goalRect;

  //縦方向のループ
  for (var i = 0; i < this.rowCount(); i++) {
    var height = (i % 2 != 0) ? masuSizeMini : masuSize; // 行の高さ
    left = 0;

    //横方向のループ
    for (var j = 0; j < this.columnCount(); j++) {
      //縦横幅設定
      var width = (j % 2 != 0) ? masuSizeMini : masuSize;
      
      if (this.cellFlg(i, j) == FLG_KABE) {
        drawRects.push({ top: top, left: left, width: width, height: height });
      }

      if (this.cellFlg(i, j) == FLG_START) {
        startRect = { top: top, left: left, width: width, height: height };
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

  //スタート地点
  var maruSize = (masuSize / 2) - 2 < 3 ? 3 : (masuSize / 2) - 2;

  this.ctx.fillStyle = '#922';
  ctx.beginPath();
  ctx.arc(startRect.left  + (masuSize / 2), 
    startRect.top + (masuSize / 2), 
    maruSize, 
    0, Math.PI*2, false);
  ctx.fill();

  //ゴール地点
  var fontSize = 20 * (1 - (masuSize / (Math.pow(masuSize, 2) - masuSize)));
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.font = Math.floor(fontSize) + "px 'ＭＳ Ｐゴシック'";
  ctx.fillText("G", 
    goalRect.left + (masuSize / 2), 
    goalRect.top  + (masuSize / 2), masuSize);

  console.log("masuSize=" + masuSize); 
  
};


var creator;

function create(lvl) {
  creator.lvl = lvl;
  if ($("#bou").is(":checked")) {
    creator.bouTaoshi();
  } else if ($("#kabeHori").is(":checked")) {
    creator.anahoriHou();
  }
}