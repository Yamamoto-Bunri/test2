// --- グローバル変数 ---
let wordList = [];
let currentIndex = 0;
let playMode = 'order';      
let filterMode = 'all';      
let masteredWords = [];      
let studentName = "";
let currentUnitName = "";    

// --- 初期化処理 ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. 名前の確認
    studentName = localStorage.getItem('studentName');
    if (!studentName) {
        window.location.href = 'index.html'; 
        return;
    }
    document.getElementById('display-name').innerText = studentName;

    // 2. Unitリストの生成（データの読み込みを待機）
    const unitListDiv = document.getElementById('unit-list');
    
    function createUnitButtons() {
        // data.js で定義されている変数が 'wordData' であることを確認してください
        if (typeof wordData !== 'undefined' && wordData !== null) {
            console.log("Data loaded successfully:", wordData);
            unitListDiv.innerHTML = ""; // 初期化
            Object.keys(wordData).forEach(unit => {
                const btn = document.createElement('button');
                btn.innerText = unit;
                btn.onclick = () => startLearning(unit);
                unitListDiv.appendChild(btn);
            });
        } else {
            // データが見つからない場合は0.2秒後に再試行
            console.log("Waiting for wordData...");
            setTimeout(createUnitButtons, 200);
        }
    }

    createUnitButtons();
});

// --- 設定切り替え（表示順） ---
window.setOrderMode = function(mode, element) {
    playMode = mode;
    const buttons = element.parentElement.querySelectorAll('.mode-btn');
    buttons.forEach(btn => btn.classList.remove('selected'));
    element.classList.add('selected');
};

// --- 設定切り替え（対象単語） ---
window.setFilterMode = function(mode, element) {
    filterMode = mode;
    const buttons = element.parentElement.querySelectorAll('.mode-btn');
    buttons.forEach(btn => btn.classList.remove('selected'));
    element.classList.add('selected');
};

// --- 学習開始（既存のロジックを維持） ---
async function startLearning(unit) {
    currentUnitName = unit;
    const { doc, getDoc } = window.fs;
    
    const docRef = doc(window.db, "progress", studentName, "units", unit);
    try {
        const docSnap = await getDoc(docRef);
        masteredWords = (docSnap.exists()) ? (docSnap.data().masteredWords || []) : [];
    } catch (e) {
        console.error("Firebase read error:", e);
        masteredWords = [];
    }

    let tempWords = [...wordData[unit]];
    if (filterMode === 'unmastered') {
        tempWords = tempWords.filter(w => !masteredWords.includes(w.english));
    }

    if (tempWords.length === 0) {
        alert("学習対象の単語がありません。");
        return;
    }

    if (playMode === 'random') {
        tempWords.sort(() => Math.random() - 0.5);
    }

    wordList = tempWords;
    currentIndex = 0;

    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('learning-screen').classList.add('active');
    document.getElementById('current-unit-title').innerText = unit;
    
    showCard();
}

// --- 以下、カード表示・音声再生などの関数（変更なしでOK） ---
function showCard() {
    const word = wordList[currentIndex];
    const card = document.getElementById('card');
    card.classList.remove('flipped');
    
    document.getElementById('word-display').innerText = word.english;
    document.getElementById('phonetic-display').innerText = word.phonetic || "";
    document.getElementById('card-back-contents').innerHTML = "";
    
    const progress = ((currentIndex + 1) / wordList.length) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
    document.getElementById('progress-text').innerText = `${currentIndex + 1} / ${wordList.length}`;
}

window.flipCard = function() {
    const card = document.getElementById('card');
    if (card.classList.contains('flipped')) return;

    const word = wordList[currentIndex];
    const isMastered = masteredWords.includes(word.english);

    document.getElementById('card-back-contents').innerHTML = `
        <div style="padding: 20px; text-align: center;">
            <p style="font-size: 1.6em; font-weight: bold; color: #007bff; margin-bottom: 10px;">${word.japanese}</p>
            <p style="font-size: 0.9em; color: #555; line-height: 1.4;">${word.example || ""}</p>
            <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                <label style="font-size: 1.3em; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <input type="checkbox" id="master-check" style="width: 25px; height: 25px;" 
                    ${isMastered ? 'checked' : ''} onchange="toggleMastered('${word.english}')">
                    <span>覚えた！</span>
                </label>
            </div>
        </div>
    `;
    card.classList.add('flipped');
};

async function toggleMastered(wordEnglish) {
    const { doc, setDoc } = window.fs;
    if (masteredWords.includes(wordEnglish)) {
        masteredWords = masteredWords.filter(w => w !== wordEnglish);
    } else {
        masteredWords.push(wordEnglish);
    }
    const docRef = doc(window.fs_db || window.db, "progress", studentName, "units", currentUnitName);
    await setDoc(docRef, { masteredWords: masteredWords }, { merge: true });
}

window.nextCard = function() {
    if (currentIndex < wordList.length - 1) {
        currentIndex++;
        showCard();
    } else {
        alert("Unitの終了です！");
        location.reload();
    }
};

window.prevCard = function() {
    if (currentIndex > 0) {
        currentIndex--;
        showCard();
    }
};

window.playAudio = function(event) {
    if (event) event.stopPropagation();
    const word = document.getElementById('word-display').innerText;
    window.speechSynthesis.cancel();
    const dummy = new SpeechSynthesisUtterance(" ");
    dummy.volume = 0;
    dummy.rate = 4.0;
    const real = new SpeechSynthesisUtterance(word);
    real.lang = 'en-US';
    real.rate = 0.9;
    window.speechSynthesis.speak(dummy);
    window.speechSynthesis.speak(real);
};