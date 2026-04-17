let studentName = "";
let currentUnit = "";
let wordList = [];       // CSVから変換されたデータ
let displayIndices = []; // 表示順（ランダムなら[3, 0, 2, 1]のようにシャッフルされる）
let currentIndex = 0;    // 現在何枚目のカードを見ているか
let isRandom = false;
let masteredWords = [];  // 覚えた単語のリスト

window.onload = function() {
    // 1. 名前の確認
    studentName = localStorage.getItem('studentName');
    if (!studentName || studentName === "null") {
        studentName = prompt("【進捗保存用】フルネームを漢字で入力してください");
        if (studentName) localStorage.setItem('studentName', studentName);
        else studentName = "匿名希望";
    }
    document.getElementById('display-name').innerText = studentName;

    // 2. Unit選択ボタンを自動生成
    const list = document.getElementById('unit-list');
    if (typeof allUnits === 'undefined') {
        list.innerHTML = "<p style='color:red;'>data.jsが読み込めていません。</p>";
        return;
    }
    
    Object.keys(allUnits).forEach(unit => {
        const btn = document.createElement('button');
        btn.innerText = unit;
        btn.onclick = () => startLearning(unit);
        list.appendChild(btn);
    });
};

// モード切り替え（順番・ランダム）
function setMode(mode) {
    isRandom = (mode === 'random');
    document.getElementById('mode-order').classList.toggle('selected', !isRandom);
    document.getElementById('mode-random').classList.toggle('selected', isRandom);
}

// 学習スタート
async function startLearning(unit) {
    currentUnit = unit;
    wordList = allUnits[unit];
    document.getElementById('current-unit-title').innerText = currentUnit;
    
    // 表示順を作成・シャッフル
    resetDisplayIndices();

    // Firebaseから覚えた単語の進捗をロード
    try {
        if (window.fs && window.db) {
            const docRef = window.fs.doc(window.db, "progress", studentName, "units", currentUnit);
            const docSnap = await window.fs.getDoc(docRef);
            masteredWords = docSnap.exists() ? (docSnap.data().words || []) : [];
        }
    } catch(e) { 
        console.error("Firebase読み込みエラー:", e); 
        masteredWords = [];
    }

    // 画面の切り替え
    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('learning-screen').classList.add('active');
    
    showCard();
}

// 表示順のリセット（ランダムシャッフル）
function resetDisplayIndices() {
    displayIndices = [...Array(wordList.length).keys()]; // [0, 1, 2, ... ]
    if (isRandom) {
        // Fisher-Yates アルゴリズムで配列をシャッフル
        for (let i = displayIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [displayIndices[i], displayIndices[j]] = [displayIndices[j], displayIndices[i]];
        }
    }
    currentIndex = 0;
}

// カードの表示
function showCard() {
    // 実際のデータの位置を取得（ランダム対応）
    const dataIndex = displayIndices[currentIndex];
    const data = wordList[dataIndex];
    
    // 表面のセット
    document.getElementById('word-display').innerText = data["Word"] || "";
    document.getElementById('pos-display').innerText = data["品詞"] || "";
    document.getElementById('phonetic-display').innerText = data["発音記号"] ? `/${data["発音記号"]}/` : "";
    
    // 裏面のセット（意味）
    const meanings = [data["意味1"], data["意味2"], data["意味3"]].filter(m => m && m.trim() !== "").join(" / ");
    document.getElementById('meanings-display').innerText = meanings;
    
    // 派生語のセット
    let derivedHtml = "";
    if (data["派生語1"]) {
        derivedHtml += `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #ccc;">
            <strong style="color: #e67e22;">【派生語 1】 ${data["派生語1"]}</strong> <span style="color:#666; font-size:0.9em;">[${data["品詞1"] || ""}]</span><br>
            ${data["意味_派生1"] || ""}
        </div>`;
    }
    if (data["派生語2"]) {
        derivedHtml += `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #ccc;">
            <strong style="color: #e67e22;">【派生語 2】 ${data["派生語2"]}</strong> <span style="color:#666; font-size:0.9em;">[${data["品詞2"] || ""}]</span><br>
            ${data["意味_派生2"] || ""}
        </div>`;
    }
    document.getElementById('derived-area').innerHTML = derivedHtml;
    
    // チェックボックスの状態を同期
    document.getElementById('mastered-checkbox').checked = masteredWords.includes(data["Word"]);
    
    // カードを表に戻す
    document.getElementById('card').classList.remove('is-flipped');
    
    updateProgressUI();
}

// カードを裏返す（HTML側から呼ばれる）
window.flipCard = function() {
    document.getElementById('card').classList.toggle('is-flipped');
};

// 覚えた！チェックの保存処理（HTML側から呼ばれる）
window.toggleMastered = async function(event) {
    const dataIndex = displayIndices[currentIndex];
    const word = wordList[dataIndex]["Word"];

    if (event.target.checked) {
        if (!masteredWords.includes(word)) masteredWords.push(word);
    } else {
        masteredWords = masteredWords.filter(w => w !== word);
    }

    updateProgressUI();

    // Firebaseへ保存
    try {
        if (window.fs && window.db) {
            const docRef = window.fs.doc(window.db, "progress", studentName, "units", currentUnit);
            await window.fs.setDoc(docRef, {
                words: masteredWords,
                updatedAt: new Date()
            });
        }
    } catch (e) {
        console.error("保存エラー:", e);
    }
};

// 次のカードへ
window.nextCard = function() {
    currentIndex++;
    if (currentIndex >= wordList.length) {
        if (isRandom) {
            alert("一巡しました！カードをシャッフルして最初に戻ります。");
            resetDisplayIndices();
        } else {
            alert("このUnitの最後まできました。最初に戻ります。");
            currentIndex = 0;
        }
    }
    showCard();
};

// 前のカードへ
window.prevCard = function() {
    if (currentIndex > 0) {
        currentIndex--;
        showCard();
    }
};

// プログレスバーの更新
function updateProgressUI() {
    const total = wordList.length;
    const percent = ((currentIndex + 1) / total) * 100;
    const masteredCount = masteredWords.length;
    
    document.getElementById('progress-text').innerText = `カード: ${currentIndex + 1} / ${total}　（覚えた数: ${masteredCount}）`;
    document.getElementById('progress-bar').style.width = `${percent}%`;
}