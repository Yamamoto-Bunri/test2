let wordList = [];
let currentIndex = 0;
let masteredWords = [];
let studentName = "";
let playOrder = 'order'; 
let filterMode = 'all';

window.onload = async function() {
    studentName = localStorage.getItem('studentName');
    if (!studentName || studentName === "null") {
        studentName = prompt("【進捗保存用】フルネームを入力してください。");
        if (studentName) localStorage.setItem('studentName', studentName);
        else studentName = "匿名希望";
    }
    document.getElementById('display-name').innerText = studentName;

    try {
        const docRef = window.fs.doc(window.db, "progress", studentName);
        const docSnap = await window.fs.getDoc(docRef);
        if (docSnap.exists()) masteredWords = docSnap.data().words || [];
    } catch (e) { console.error("Firebase読み込みエラー", e); }

    const listDiv = document.getElementById('unit-list');
    if (typeof allUnits !== 'undefined') {
        Object.keys(allUnits).forEach(unitName => {
            const btn = document.createElement('button');
            btn.innerText = unitName;
            btn.onclick = () => startLearning(unitName);
            listDiv.appendChild(btn);
        });
    }

    const card = document.getElementById('card');
    card.onclick = function() {
        this.classList.toggle('is-flipped');
    };
};

window.setOrder = function(mode) {
    playOrder = mode;
    document.getElementById('btn-order').classList.toggle('selected', mode === 'order');
    document.getElementById('btn-random').classList.toggle('selected', mode === 'random');
};

window.setFilter = function(mode) {
    filterMode = mode;
    document.getElementById('btn-all').classList.toggle('selected', mode === 'all');
    document.getElementById('btn-unmastered').classList.toggle('selected', mode === 'unmastered');
};

function startLearning(unitName) {
    let rawList = [...allUnits[unitName]];
    if (filterMode === 'unmastered') {
        rawList = rawList.filter(item => !masteredWords.includes(item.Word));
    }
    if (rawList.length === 0) { alert("単語がありません。"); return; }
    if (playOrder === 'random') rawList.sort(() => Math.random() - 0.5);

    wordList = rawList;
    currentIndex = 0;
    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('learning-screen').classList.add('active');
    displayCard();
}

function displayCard() {
    const data = wordList[currentIndex];
    const isMastered = masteredWords.includes(data.Word);

    // 表面
    document.getElementById("word-display").innerText = data.Word;
    document.getElementById("pos-display").innerText = data["品詞"] || "";
    document.getElementById("phonetic-display").innerText = data["発音記号"] || "";
    document.getElementById("complete-badge").style.display = isMastered ? "block" : "none";

    // 裏面 (ここが重要！)
    const meanings = [data["意味1"], data["意味2"], data["意味3"]]
        .filter(m => m && m.trim() !== "").join(" / ");
    document.getElementById("meanings-display").innerText = meanings;

    // 派生語エリア
    const dDisplay = document.getElementById('derived-display');
    const dButton = document.getElementById('show-derived');
    dDisplay.style.display = 'none';

    const hasDerived = (data["別の品詞"] && data["別の品詞"].trim() !== "") || (data["派生語1"] && data["派生語1"].trim() !== "");
    if (hasDerived) {
        dButton.style.display = "block";
        let html = "";
        if (data["別の品詞"]) html += `<div style="background:#f8f9fa;padding:8px;margin-top:10px;"><strong>【別の品詞】</strong><br>${data["別の品詞"]} : ${data["意味"] || ""}</div>`;
        if (data["派生語1"]) html += `<div style="margin-top:10px;"><strong>【派生語 1】</strong><br><strong>${data["派生語1"]}</strong> [${data["品詞1"] || ""}]<br>${data["意味1.1"] || ""}</div>`;
        if (data["派生語2"]) html += `<div style="margin-top:10px;"><strong>【派生語 2】</strong><br><strong>${data["派生語2"]}</strong> [${data["品詞2"] || ""}]<br>${data["意味2.1"] || ""}</div>`;
        dDisplay.innerHTML = html;
    } else {
        dButton.style.display = "none";
    }

    document.getElementById("mastered-checkbox").checked = isMastered;
    updateProgress();
}

window.toggleMastered = async function(event) {
    const word = wordList[currentIndex].Word;
    if (event.target.checked) {
        if (!masteredWords.includes(word)) masteredWords.push(word);
    } else {
        masteredWords = masteredWords.filter(w => w !== word);
    }
    document.getElementById("complete-badge").style.display = event.target.checked ? "block" : "none";
    
    try {
        await window.fs.setDoc(window.fs.doc(window.db, "progress", studentName), {
            words: masteredWords,
            updatedAt: new Date()
        });
    } catch (e) { console.error("保存失敗", e); }
};

function updateProgress() {
    const total = wordList.length;
    document.getElementById("progress-text").innerText = `${currentIndex + 1} / ${total}`;
    document.getElementById("progress-bar").style.width = `${((currentIndex + 1) / total) * 100}%`;
}

window.nextCard = function() {
    if (currentIndex < wordList.length - 1) {
        currentIndex++;
        document.getElementById('card').classList.remove('is-flipped');
        displayCard();
    } else { alert("終了です！"); }
};

window.prevCard = function() {
    if (currentIndex > 0) {
        currentIndex--;
        document.getElementById('card').classList.remove('is-flipped');
        displayCard();
    }
};

window.toggleDerived = function(event) {
    event.stopPropagation();
    const d = document.getElementById('derived-display');
    d.style.display = d.style.display === 'block' ? 'none' : 'block';
};