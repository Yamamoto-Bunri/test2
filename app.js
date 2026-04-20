// --- グローバル変数 ---
let wordList = [];
let currentIndex = 0;
let playMode = 'order';      // 'order' or 'random'
let filterMode = 'all';      // 'all' or 'unmastered'
let masteredWords = [];      // Firebaseから取得した習得済み単語リスト
let studentName = "";

// --- 初期化処理 ---
document.addEventListener('DOMContentLoaded', () => {
    // ログイン情報の確認
    studentName = localStorage.getItem('studentName');
    if (!studentName) {
        window.location.href = 'index.html'; // 名前がない場合は戻す（運用に合わせて調整）
        return;
    }
    document.getElementById('display-name').innerText = studentName;

    // Unitリストの生成
    const unitListDiv = document.getElementById('unit-list');
    Object.keys(wordData).forEach(unit => {
        const btn = document.createElement('button');
        btn.innerText = unit;
        btn.onclick = () => startLearning(unit);
        unitListDiv.appendChild(btn);
    });
});

// --- モード設定関数 ---
window.setMode = function(mode) {
    playMode = mode;
    document.getElementById('mode-order').classList.toggle('selected', mode === 'order');
    document.getElementById('mode-random').classList.toggle('selected', mode === 'random');
};

window.setFilterMode = function(mode, element) {
    filterMode = mode;
    const buttons = element.parentElement.querySelectorAll('.mode-btn');
    buttons.forEach(btn => btn.classList.remove('selected'));
    element.classList.add('selected');
};

// --- 学習開始処理 ---
async function startLearning(unit) {
    const { doc, getDoc } = window.fs;
    
    // Firebaseから進捗を読み込み
    const docRef = doc(window.db, "progress", studentName, "units", unit);
    const docSnap = await getDoc(docRef);
    
    masteredWords = [];
    if (docSnap.exists()) {
        masteredWords = docSnap.data().masteredWords || [];
    }

    // 単語リストの準備
    let tempWords = [...wordData[unit]];

    // 「未習得のみ」フィルターの適用
    if (filterMode === 'unmastered') {
        tempWords = tempWords.filter(w => !masteredWords.includes(w.english));
    }

    // 未習得が0個の場合のチェック
    if (tempWords.length === 0) {
        alert(filterMode === 'unmastered' ? "このUnitはすべて習得済みです！" : "単語データがありません。");
        return;
    }

    // 並び替え（ランダムの場合）
    if (playMode === 'random') {
        tempWords.sort(() => Math.random() - 0.5);
    }

    wordList = tempWords;
    currentIndex = 0;

    // 画面切り替え
    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('learning-screen').classList.add('active');
    
    showCard();
}

// --- カード表示処理 ---
function showCard() {
    const word = wordList[currentIndex];
    const card = document.getElementById('card');
    
    // カードを表面に戻す
    card.classList.remove('flipped');
    
    // 表面（英語）の表示
    document.getElementById('word-display').innerText = word.english;
    document.getElementById('phonetic-display').innerText = word.phonetic || "";
    
    // 裏面（日本語）の構築（めくるまで中身を空にする）
    document.getElementById('card-back-contents').innerHTML = "";
}

// --- カードをめくる処理 ---
window.flipCard = function() {
    const card = document.getElementById('card');
    if (card.classList.contains('flipped')) return;

    const word = wordList[currentIndex];
    const isMastered = masteredWords.includes(word.english);

    // 裏面の内容を注入
    document.getElementById('card-back-contents').innerHTML = `
        <p style="font-size: 1.5em; font-weight: bold; margin-bottom: 10px;">${word.japanese}</p>
        <p style="color: #666; margin-bottom: 20px;">${word.example || ""}</p>
        <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
            <label style="font-size: 1.2em; cursor: pointer;">
                <input type="checkbox" id="master-check" style="transform: scale(1.5);" 
                ${isMastered ? 'checked' : ''} onchange="toggleMastered('${word.english}')">
                覚えた！
            </label>
        </div>
    `;

    card.classList.add('flipped');
    
    // 自動再生が必要な場合はここで playAudio() を呼ぶ
};

// --- 習得状況の保存 ---
async function toggleMastered(wordEnglish) {
    const { doc, setDoc } = window.fs;
    const currentUnit = document.querySelector('#unit-list button:disabled')?.innerText || ""; 
    // ※実際にはstartLearning時に選択されたUnit名を保持しておくのがスマート

    if (masteredWords.includes(wordEnglish)) {
        masteredWords = masteredWords.filter(w => w !== wordEnglish);
    } else {
        masteredWords.push(wordEnglish);
    }

    // Firebaseへ保存（現在のUnit名を特定して保存）
    // startLearning時に現在のUnit名をグローバルに持たせるとより確実
    const unitName = document.querySelector('h1').innerText; // タイトルなどから取得（適宜調整）
    // 今回は簡易的に現在のwordListの元データを特定するなどの処理が必要
}

// --- ナビゲーション ---
window.nextCard = function() {
    if (currentIndex < wordList.length - 1) {
        currentIndex++;
        showCard();
    } else {
        alert("最後のカードです！");
        location.reload(); // セットアップ画面に戻る
    }
};

window.prevCard = function() {
    if (currentIndex > 0) {
        currentIndex--;
        showCard();
    }
};

// --- 音声読み上げ機能（無音助走＋2回読み安定版） ---
let currentAudio = null; 
window.playAudio = function(event) {
    if (event) event.stopPropagation();
    
    const word = document.getElementById('word-display').innerText;
    if (!word) return;

    window.speechSynthesis.cancel();

    // 1回目：無音・最速（デバイス起動用）
    const dummy = new SpeechSynthesisUtterance(" ");
    dummy.volume = 0;
    dummy.rate = 4.0;

    // 2回目：本番（聞き取りやすい速度）
    const real = new SpeechSynthesisUtterance(word);
    real.lang = 'en-US';
    real.volume = 1.0;
    real.rate = 0.9;

    window.speechSynthesis.speak(dummy);
    window.speechSynthesis.speak(real);
};