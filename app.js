let studentName = "";
let currentUnit = "";
let wordList = [];
let displayIndices = [];
let currentIndex = 0;
let isRandom = false;
let masteredWords = [];

// 音声読み上げ用（Chromeバグ回避のためグローバルに定義）
let dummyUtterance = null;
let realUtterance = null;

window.onload = function() {
    studentName = localStorage.getItem('studentName');
    if (!studentName || studentName === "null") {
        studentName = prompt("【進捗保存用】フルネームを入力してください");
        if (studentName) localStorage.setItem('studentName', studentName);
    }
    document.getElementById('display-name').innerText = studentName || "未設定";

    const list = document.getElementById('unit-list');
    
    // data.js が正しく読み込めているかチェック
    if (typeof allUnits !== 'undefined') {
        const units = Object.keys(allUnits);
        if (units.length === 0) {
            list.innerHTML = "<p style='color:red;'>data.jsにデータがありません。CSV変換をやり直してください。</p>";
            return;
        }
        
        units.forEach(unit => {
            const btn = document.createElement('button');
            btn.innerText = unit;
            btn.onclick = () => startLearning(unit);
            list.appendChild(btn);
        });
    } else {
        list.innerHTML = "<p style='color:red;'>data.jsが見つからないか、エラーになっています。</p>";
    }
};

function setMode(mode) {
    isRandom = (mode === 'random');
    document.getElementById('mode-order').classList.toggle('selected', !isRandom);
    document.getElementById('mode-random').classList.toggle('selected', isRandom);
}

async function startLearning(unit) {
    currentUnit = unit;
    wordList = allUnits[unit];
    resetDisplayIndices();

    // 進捗ロード
    try {
        if (window.fs && window.db) {
            const docRef = window.fs.doc(window.db, "progress", studentName, "units", currentUnit);
            const docSnap = await window.fs.getDoc(docRef);
            masteredWords = docSnap.exists() ? (docSnap.data().words || []) : [];
        }
    } catch(e) { masteredWords = []; }

    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('learning-screen').classList.add('active');
    document.getElementById('current-unit-title').innerText = currentUnit;
    
    showCard();
}

function resetDisplayIndices() {
    displayIndices = [...Array(wordList.length).keys()];
    if (isRandom) {
        for (let i = displayIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [displayIndices[i], displayIndices[j]] = [displayIndices[j], displayIndices[i]];
        }
    }
    currentIndex = 0;
}

// 表面の更新
function showCard() {
    const dataIndex = displayIndices[currentIndex];
    const data = wordList[dataIndex];
    
    document.getElementById('card').classList.remove('is-flipped');

    document.getElementById('word-display').innerText = data["Word"] || "";
    document.getElementById('pos-display').innerText = data["品詞"] || "";
    document.getElementById('phonetic-display').innerText = data["発音記号"] ? `/${data["発音記号"]}/` : "";
    
    // 裏面をクリア
    document.getElementById('card-back-contents').innerHTML = "";
    
    updateProgressUI();
}

// カードをめくる
window.flipCard = function() {
    const card = document.getElementById('card');
    card.classList.toggle('is-flipped');

    if (card.classList.contains('is-flipped')) {
        renderBackSide();
    }
};

// 裏面の生成
function renderBackSide() {
    const dataIndex = displayIndices[currentIndex];
    const data = wordList[dataIndex];
    const back = document.getElementById('card-back-contents');

    const meanings = [data["意味1"], data["意味2"], data["意味3"]].filter(m => m && m.trim() !== "").join(" / ");
    const isMastered = masteredWords.includes(data["Word"]);

    let html = `
        <h2 style="margin-top: 0; color: #333; font-size: 1.2em; border-bottom: 2px solid #eee; padding-bottom: 5px;">意味</h2>
        <p style="font-size: 1.3em; font-weight: bold; color: #2c3e50; margin: 10px 0;">${meanings}</p>
    `;

    if (data["派生語1"]) {
        html += `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ccc; font-size: 0.9em;">
                    <strong style="color: #e67e22;">派生語: ${data["派生語1"]}</strong> [${data["品詞1"] || ""}]<br>${data["意味_派生1"] || ""}
                 </div>`;
    }
    if (data["派生語2"]) {
        html += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ccc; font-size: 0.9em;">
                    <strong style="color: #e67e22;">派生語: ${data["派生語2"]}</strong> [${data["品詞2"] || ""}]<br>${data["意味_派生2"] || ""}
                 </div>`;
    }

    html += `
        <label class="mastered-label" onclick="event.stopPropagation()">
            <input type="checkbox" id="mastered-checkbox" onchange="toggleMastered(event)" ${isMastered ? 'checked' : ''} style="transform: scale(1.6); margin-right: 12px;">
            覚えた！
        </label>
    `;

    back.innerHTML = html;
}

window.toggleMastered = async function(event) {
    const dataIndex = displayIndices[currentIndex];
    const word = wordList[dataIndex]["Word"];

    if (event.target.checked) {
        if (!masteredWords.includes(word)) masteredWords.push(word);
    } else {
        masteredWords = masteredWords.filter(w => w !== word);
    }
    updateProgressUI();

    try {
        if (window.fs && window.db) {
            const docRef = window.fs.doc(window.db, "progress", studentName, "units", currentUnit);
            await window.fs.setDoc(docRef, { words: masteredWords, updatedAt: new Date() });
        }
    } catch (e) { console.error("Firebase Save Error", e); }
};

window.nextCard = function() {
    currentIndex++;
    if (currentIndex >= wordList.length) {
        if (isRandom) {
            alert("一周しました。順序を入れ替えます。");
            resetDisplayIndices();
        } else {
            alert("最後まで到達しました。最初に戻ります。");
            currentIndex = 0;
        }
    }
    showCard();
};

window.prevCard = function() {
    if (currentIndex > 0) {
        currentIndex--;
        showCard();
    }
};

function updateProgressUI() {
    const total = wordList.length;
    const percent = ((currentIndex + 1) / total) * 100;
    document.getElementById('progress-text').innerText = `カード: ${currentIndex + 1} / ${total} （覚えた: ${masteredWords.length}）`;
    document.getElementById('progress-bar').style.width = `${percent}%`;
}

// --- 音声読み上げ機能（最速レスポンス ＆ 2回発音による頭切れ回避） ---

let currentUtterance = null; // 変数消失バグ対策

window.playAudio = function(event) {
    if (event) event.stopPropagation();
    
    const word = document.getElementById('word-display').innerText;
    if (!word) return;

    // 前の音声を即座にキャンセル（遅延の原因になる無駄な待機を廃止）
    window.speechSynthesis.cancel();

    // 単語を2回繰り返す（間にカンマを2つ入れて、一瞬のタメを作る）
    // 1回目が切れてしまっても、2回目で確実に耳に入ります
    const textToSpeak = word + ", , " + word;

    currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
    currentUtterance.lang = 'en-US';
    currentUtterance.rate = 0.85; // 2回読むので少し落ち着いた速度に
    currentUtterance.pitch = 1.0;

    // 即座に再生
    window.speechSynthesis.speak(currentUtterance);
};