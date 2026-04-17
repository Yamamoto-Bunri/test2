let studentName = "";
let currentUnit = "";
let wordList = [];
let displayIndices = [];
let currentIndex = 0;
let isRandom = false;
let masteredWords = [];

window.onload = function() {
    studentName = localStorage.getItem('studentName');
    if (!studentName || studentName === "null") {
        studentName = prompt("【進捗保存用】フルネームを入力してください");
        if (studentName) localStorage.setItem('studentName', studentName);
    }
    document.getElementById('display-name').innerText = studentName || "未設定";

    const list = document.getElementById('unit-list');
    if (typeof allUnits !== 'undefined') {
        Object.keys(allUnits).forEach(unit => {
            const btn = document.createElement('button');
            btn.innerText = unit;
            btn.onclick = () => startLearning(unit);
            list.appendChild(btn);
        });
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

// 表面の更新（カード移動時に呼ばれる）
function showCard() {
    const dataIndex = displayIndices[currentIndex];
    const data = wordList[dataIndex];
    
    // カードを強制的に表面に戻す
    document.getElementById('card').classList.remove('is-flipped');

    // 表面のみ書き換え
    document.getElementById('word-display').innerText = data["Word"] || "";
    document.getElementById('pos-display').innerText = data["品詞"] || "";
    document.getElementById('phonetic-display').innerText = data["発音記号"] ? `/${data["発音記号"]}/` : "";
    
    // 【重要】裏面を空にする（カンニング防止と残像消去）
    document.getElementById('card-back-contents').innerHTML = "";
    
    updateProgressUI();
}

// カードをめくる処理
window.flipCard = function() {
    const card = document.getElementById('card');
    card.classList.toggle('is-flipped');

    // 裏面になった瞬間にだけ、内容を生成する
    if (card.classList.contains('is-flipped')) {
        renderBackSide();
    }
};

// 裏面の更新（めくった瞬間に呼ばれる）
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

    // 派生語
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

    // チェックボックス（イベント伝播を止めて、チェック時にカードが戻らないようにする）
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
// --- 音声読み上げ機能（頭切れ完全対策版） ---

// --- 音声読み上げ機能（Chrome頭切れ対策：無音ダミー起動版） ---

// ブラウザのバグで変数が消去されないよう、外側に定義
let dummyUtterance = null;
let realUtterance = null;

window.playAudio = function(event) {
    if (event) event.stopPropagation();
    
    const word = document.getElementById('word-display').innerText;
    if (!word) return;

    // 1. 再生中の音声を一旦リセット
    window.speechSynthesis.cancel();

    // 2. エンジンを「完全に起こす」ためのダミー音声を用意
    // （空文字だとChromeに無視されることがあるため、短い文字を入れて音量をゼロにします）
    dummyUtterance = new SpeechSynthesisUtterance("a"); 
    dummyUtterance.volume = 0; // 無音にする

    // 3. 実際に読み上げる本命の音声を用意
    realUtterance = new SpeechSynthesisUtterance(word);
    realUtterance.lang = 'en-US';
    realUtterance.rate = 0.9;
    realUtterance.pitch = 1.0;
    realUtterance.volume = 1.0; // こちらは通常の音量

    // 4. ダミー → 本命 の順で連続再生（キューに登録）
    // ダミーを無音で処理している間にエンジンが完全に立ち上がり、本命の頭切れを防ぎます。
    window.speechSynthesis.speak(dummyUtterance);
    window.speechSynthesis.speak(realUtterance);