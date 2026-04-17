let studentName = "";
let currentUnit = "";
let wordList = [];       // 元のデータ
let displayIndices = []; // 表示する順番（ランダムならシャッフルされる）
let currentIndex = 0;
let isRandom = false;
let masteredWords = [];

window.onload = function() {
    studentName = localStorage.getItem('studentName') || prompt("フルネームを入力してください");
    if(studentName) {
        localStorage.setItem('studentName', studentName);
        document.getElementById('display-name').innerText = studentName;
    }

    // Unitボタンを自動生成
    const list = document.getElementById('unit-list');
    Object.keys(allUnits).forEach(unit => {
        const btn = document.createElement('button');
        btn.innerText = unit;
        btn.onclick = () => startLearning(unit);
        list.appendChild(btn);
    });
};

function setMode(mode) {
    isRandom = (mode === 'random');
    document.getElementById('mode-order').classList.toggle('selected', !isRandom);
    document.getElementById('mode-random').classList.toggle('selected', isRandom);
}

async function startLearning(unit) {
    currentUnit = unit;
    wordList = allUnits[unit];
    
    // 表示順を作成
    resetDisplayIndices();

    // Firebaseから進捗をロード
    try {
        const docRef = window.fs.doc(window.db, "progress", studentName, "units", currentUnit);
        const docSnap = await window.fs.getDoc(docRef);
        masteredWords = docSnap.exists() ? (docSnap.data().words || []) : [];
    } catch(e) { console.error(e); }

    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('learning-screen').classList.add('active');
    
    showCard();
}

function resetDisplayIndices() {
    displayIndices = [...Array(wordList.length).keys()];
    if (isRandom) {
        // シャッフル（Fisher-Yates法）
        for (let i = displayIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [displayIndices[i], displayIndices[j]] = [displayIndices[j], displayIndices[i]];
        }
    }
    currentIndex = 0;
}

function showCard() {
    const dataIndex = displayIndices[currentIndex];
    const data = wordList[dataIndex];
    
    // 表面
    document.getElementById('word-display').innerText = data["Word"];
    document.getElementById('pos-display').innerText = data["品詞"];
    document.getElementById('phonetic-display').innerText = data["発音記号"];
    
    // 裏面 (表示内容は以前と同様)
    const meanings = [data["意味1"], data["意味2"], data["意味3"]].filter(m=>m).join(" / ");
    document.getElementById('meanings-display').innerText = meanings;
    
    document.getElementById('mastered-checkbox').checked = masteredWords.includes(data["Word"]);
    document.getElementById('card').classList.remove('is-flipped');
    
    updateProgressUI();
}

function nextCard() {
    currentIndex++;
    if (currentIndex >= wordList.length) {
        if (isRandom) {
            alert("一巡しました。順序を入れ替えます。");
            resetDisplayIndices();
        } else {
            currentIndex = 0;
            alert("最初に戻ります。");
        }
    }
    showCard();
}

function prevCard() {
    if (currentIndex > 0) {
        currentIndex--;
        showCard();
    }
}

function updateProgressUI() {
    const total = wordList.length;
    const count = masteredWords.length; // 簡易版
    const percent = (currentIndex + 1) / total * 100;
    document.getElementById('progress-text').innerText = `Card: ${currentIndex + 1} / ${total}`;
    document.getElementById('progress-bar').style.width = `${percent}%`;
}

// toggleMastered 等のFirebase送信処理は以前のものを流用