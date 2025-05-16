import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let calculatorModel;
let displayMesh, canvasTexture, textureContext;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let clickableObjects = [];

// --- 電卓ロジック用変数 ---
let currentInput = '0';
let previousInput = '';
let operator = null;
let shouldResetDisplay = false;

// --- Three.js 初期化 ---
function initThreeJS() {
    const container = document.getElementById('canvas-container');
    const loadingInfo = document.getElementById('loading-info');

    if (!container) {
        console.error("Error: canvas-container not found!");
        if (loadingInfo) loadingInfo.textContent = "エラー:描画エリアが見つかりません。";
        return;
    }

    try {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xdddddd);

        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 1.2, 6.5); // Zを少し遠めに再調整

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // ソフトシャドウ
        container.appendChild(renderer.domElement);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 2.5;
        controls.maxDistance = 15;
        controls.target.set(0, 0.5, 0);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9); // 環境光少し強く
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.3); // 指向性光少し強く
        directionalLight.position.set(8, 15, 12); // 光源位置調整
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 40; // farを調整
        directionalLight.shadow.bias = -0.0005; // bias調整
        scene.add(directionalLight);

        // ヘルパー (デバッグ用、完成時はコメントアウト)
        // const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
        // scene.add(shadowHelper);
        // const axesHelper = new THREE.AxesHelper(5);
        // scene.add(axesHelper);

        createCalculatorModel();

        renderer.domElement.addEventListener('pointerdown', onPointerDown, false);

        animate();
        window.addEventListener('resize', onWindowResize, false);

        if (loadingInfo) {
            setTimeout(() => {
                loadingInfo.style.display = 'none';
            }, 500); // 少し短く
        }
        console.log("Three.js initialized successfully.");

    } catch (error) {
        console.error("Error during Three.js initialization:", error);
        if (loadingInfo) loadingInfo.textContent = "初期化エラーが発生しました。コンソールを確認してください。";
    }
}

// --- 3D電卓モデル作成 ---
// --- 3D電卓モデル作成 ---
function createCalculatorModel() {
    calculatorModel = new THREE.Group();

    const bodyWidth = 2.0;
    const bodyHeight = 3.6;
    const bodyDepth = 0.3;

    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x383838,
        metalness: 0.35,
        roughness: 0.55,
    });
    const bodyGeometry = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    calculatorModel.add(bodyMesh);

    // ディスプレイ関連
    const screenWidth = 1.6;
    const screenHeight = 0.65;
    const screenPanelDepth = 0.03;
    const screenFrameThickness = 0.05;
    const displayCenterY = bodyHeight * 0.5 - screenHeight * 0.5 - 0.35;

    // ディスプレイの枠
    const screenFrameMaterial = new THREE.MeshStandardMaterial({
        color: 0x252525,
        metalness: 0.3,
        roughness: 0.45
    });
    const screenFrameGeometry = new THREE.BoxGeometry(
        screenWidth + screenFrameThickness,
        screenHeight + screenFrameThickness,
        screenPanelDepth + 0.005
    );
    const screenFrameMesh = new THREE.Mesh(screenFrameGeometry, screenFrameMaterial);
    screenFrameMesh.position.set(0, displayCenterY, bodyDepth / 2 + (screenPanelDepth + 0.005) / 2 - screenPanelDepth / 2 );
    screenFrameMesh.castShadow = true;
    calculatorModel.add(screenFrameMesh);

    // ディスプレイ表示面 (CanvasTexture用)
    const canvas = document.createElement('canvas');
    const textureSize = 512;
    canvas.width = textureSize * (screenWidth / screenHeight);
    canvas.height = textureSize;
    textureContext = canvas.getContext('2d');
    canvasTexture = new THREE.CanvasTexture(canvas);

    const screenDisplayMaterial = new THREE.MeshStandardMaterial({
        map: canvasTexture,
        emissive: 0x607D8B,
        emissiveIntensity: 0.9,
        roughness: 0.95,
    });
    update3DDisplay("0"); // 初期表示

    const screenPanelGeometry = new THREE.BoxGeometry(screenWidth, screenHeight, screenPanelDepth);
    displayMesh = new THREE.Mesh(screenPanelGeometry, screenDisplayMaterial);
    displayMesh.position.set(0, displayCenterY, bodyDepth / 2 + screenPanelDepth / 2 + 0.001);
    calculatorModel.add(displayMesh);


    // ボタン群
    const buttonSize = 0.36;
    const buttonDepth = 0.1;
    const buttonSpacing = 0.07;
    const buttonRows = 5; // 物理的な行数
    const buttonCols = 4; // 物理的な列数
    const startX = - (buttonCols / 2 - 0.5) * (buttonSize + buttonSpacing);
    const buttonsTopY = displayCenterY - screenHeight / 2 - 0.25;

    // [表示文字, 内部値] のペアで定義
    // 最後の行はCボタンなので、それを考慮した配列構造
    const buttonDefinitions = [
        // Row 0
        ['7', '7'], ['8', '8'], ['9', '9'], ['÷', '/'],
        // Row 1
        ['4', '4'], ['5', '5'], ['6', '6'], ['×', '*'],
        // Row 2
        ['1', '1'], ['2', '2'], ['3', '3'], ['-', '-'],
        // Row 3
        ['0', '0'], ['.', '.'], ['=', '='], ['+', '+'],
        // Row 4 (C button - special handling)
        // Cボタンは1つの要素として扱い、ループ内で特別に処理する
    ];
    const cButtonDefinition = ['C', 'C'];


    const buttonFont = "bold 46px Arial";
    const buttonTextColor = "white";
    clickableObjects = [];

    const numButtonMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.2, roughness: 0.7 });
    const opButtonMaterial = new THREE.MeshStandardMaterial({ color: 0xFF9800, metalness: 0.2, roughness: 0.7 });
    const clearButtonMaterial = new THREE.MeshStandardMaterial({ color: 0xF44336, metalness: 0.2, roughness: 0.7 });
    const equalsButtonMaterial = new THREE.MeshStandardMaterial({ color: 0x4CAF50, metalness: 0.2, roughness: 0.7 });

    let definitionIndex = 0; // buttonDefinitions 配列のインデックス

    for (let r = 0; r < buttonRows; r++) {
        for (let c = 0; c < buttonCols; c++) {
            let buttonDisplayValue;
            let buttonInternalValue;
            let currentButtonSizeX = buttonSize;
            let currentMaterial;
            let buttonType;

            if (r === 4) { // 最後の行はCボタン
                if (c === 0) { // Cボタンは最初の列のみで描画
                    buttonDisplayValue = cButtonDefinition[0];
                    buttonInternalValue = cButtonDefinition[1];
                    currentButtonSizeX = buttonSize * buttonCols + buttonSpacing * (buttonCols - 1); // 横長
                    currentMaterial = clearButtonMaterial;
                    buttonType = 'clear';
                } else {
                    continue; // Cボタン行の2列目以降はスキップ
                }
            } else { // 通常のボタン (Cボタン以外の行)
                if (definitionIndex < buttonDefinitions.length) {
                    buttonDisplayValue = buttonDefinitions[definitionIndex][0];
                    buttonInternalValue = buttonDefinitions[definitionIndex][1];
                    definitionIndex++;
                } else {
                    console.error("Button definition out of bounds!");
                    continue;
                }

                // buttonInternalValue を使って判定
                if (['/', '*', '-', '+'].includes(buttonInternalValue)) {
                    currentMaterial = opButtonMaterial; buttonType = 'operator';
                } else if (buttonInternalValue === '=') {
                    currentMaterial = equalsButtonMaterial; buttonType = 'equals';
                } else if (buttonInternalValue === '.') {
                    currentMaterial = numButtonMaterial; buttonType = 'decimal';
                } else { // 数字ボタン
                    currentMaterial = numButtonMaterial; buttonType = 'number';
                }
            }

            const buttonGeometry = new THREE.BoxGeometry(currentButtonSizeX, buttonSize, buttonDepth);
            const buttonMesh = new THREE.Mesh(buttonGeometry, currentMaterial.clone());

            let posX = startX + c * (buttonSize + buttonSpacing);
            // Cボタンまたは横幅が異なるボタンの場合の位置調整
            if (buttonInternalValue === 'C') {
                posX = 0; // Cボタンは中央揃え
            } else if (currentButtonSizeX !== buttonSize) {
                // もしC以外で横幅が異なるボタンがあれば、ここでposXを調整
                // 今回はCボタンのみが横幅可変なので、この分岐は実質Cボタン用
                posX = startX + ( (currentButtonSizeX - buttonSize) / 2 ) + c * (buttonSize + buttonSpacing) ;
            }


            const currentButtonY = buttonsTopY - buttonSize / 2 - r * (buttonSize + buttonSpacing);
            buttonMesh.position.set(posX, currentButtonY, bodyDepth / 2 + buttonDepth / 2);
            buttonMesh.castShadow = true;
            buttonMesh.receiveShadow = true;
            buttonMesh.userData = { value: buttonInternalValue, type: buttonType, originalColor: currentMaterial.color.clone() };
            calculatorModel.add(buttonMesh);
            clickableObjects.push(buttonMesh);

            // ボタンラベル
            const labelCanvas = document.createElement('canvas');
            const labelResBase = 128;
            labelCanvas.width = (buttonInternalValue === 'C') ? labelResBase * (currentButtonSizeX / buttonSize) : labelResBase;
            labelCanvas.height = labelResBase;
            const labelCtx = labelCanvas.getContext('2d');
            const scaledFontSize = 46 * (labelResBase / 128);
            labelCtx.font = `bold ${scaledFontSize}px Arial`;
            labelCtx.fillStyle = buttonTextColor;
            labelCtx.textAlign = "center";
            labelCtx.textBaseline = "middle";
            labelCtx.fillText(buttonDisplayValue, labelCanvas.width / 2, labelCanvas.height / 2 + scaledFontSize * 0.08);

            const labelTexture = new THREE.CanvasTexture(labelCanvas);
            const labelMaterial = new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide });
            const labelPlane = new THREE.PlaneGeometry(currentButtonSizeX * 0.8, buttonSize * 0.8);
            const labelMesh = new THREE.Mesh(labelPlane, labelMaterial);
            labelMesh.position.set(posX, currentButtonY, bodyDepth / 2 + buttonDepth + 0.015);
            calculatorModel.add(labelMesh);
        }
    }
    scene.add(calculatorModel);
    console.log("Calculator model created with updated button labels.");
}
// --- 3Dモデルのディスプレイ表示更新 ---
function update3DDisplay(text) {
    if (!textureContext || !canvasTexture) {
        console.warn("update3DDisplay called before textureContext/canvasTexture initialized.");
        return;
    }
    const canvas = textureContext.canvas;
    textureContext.fillStyle = '#455A64'; // ディスプレイ背景色 (濃い青系グレー)
    textureContext.fillRect(0, 0, canvas.width, canvas.height);

    const baseFontSize = canvas.height * 0.65; // フォントサイズ調整
    textureContext.font = `bold ${baseFontSize}px "DS-Digital", Consolas, monospace`;
    textureContext.fillStyle = '#CFD8DC'; // 文字色 (明るい青系グレー)
    textureContext.textAlign = 'right';
    textureContext.textBaseline = 'middle';

    let displayText = String(text);
    const padding = canvas.width * 0.05;
    const maxWidth = canvas.width - (padding * 2);
    let textWidth = textureContext.measureText(displayText).width;
    let currentFontSize = baseFontSize;

    while (textWidth > maxWidth && currentFontSize > 12) { // 最小フォントサイズ調整
        currentFontSize -= 2;
        textureContext.font = `bold ${currentFontSize}px "DS-Digital", Consolas, monospace`;
        textWidth = textureContext.measureText(displayText).width;
    }

    const MAX_DISPLAY_CHARS = 12;
    if (displayText.length > MAX_DISPLAY_CHARS) {
         displayText = displayText.substring(displayText.length - MAX_DISPLAY_CHARS);
    }

    textureContext.fillText(displayText, canvas.width - padding, canvas.height / 2 + currentFontSize * 0.04); // Yオフセット調整
    canvasTexture.needsUpdate = true;
}

// --- アニメーションループ ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// --- ウィンドウリサイズ処理 ---
function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    console.log("Window resized.");
}

// --- ポインターイベント処理 ---
function onPointerDown(event) {
    if (!renderer || !camera || !clickableObjects || clickableObjects.length === 0) return;

    // OrbitControlsがドラッグ操作中の場合はボタンクリックを無視（簡易的な対策）
    // pointerupで判定する方がより正確だが、ここではpointerdownで処理
    // if (controls.object && controls.object.uuid === camera.uuid && controls.enabled && controls.state !== -1) return;


    const canvasBounds = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
    mouse.y = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(clickableObjects); // recursive: false は不要 (Group直下のため)

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        if (intersectedObject.userData && typeof intersectedObject.userData.value !== 'undefined') {
            const buttonValue = intersectedObject.userData.value;
            const buttonType = intersectedObject.userData.type;

            // フィードバックアニメーション
            const originalZ = intersectedObject.position.z;
            const pressDepth = 0.03;
            intersectedObject.position.z -= pressDepth;
            const originalColor = intersectedObject.userData.originalColor.clone(); // 複製して保持
            intersectedObject.material.color.setHex(0xffffff); // 一時的に白

            setTimeout(() => {
                intersectedObject.position.z = originalZ;
                if (intersectedObject.material) { // オブジェクトが存在することを確認
                    intersectedObject.material.color.copy(originalColor);
                }
            }, 120); // 戻るまでの時間調整

            // 電卓ロジック呼び出し
            if (buttonType === 'number') appendNumber(buttonValue);
            else if (buttonType === 'operator') chooseOperator(buttonValue);
            else if (buttonType === 'decimal') appendDecimal();
            else if (buttonType === 'equals') calculate();
            else if (buttonType === 'clear') clearAll();
        }
    }
}

// --- 電卓ロジック ---
function updateDisplayAndLog() {
    update3DDisplay(currentInput);
    // console.log(`Display: ${currentInput}, Prev: ${previousInput}, Op: ${operator}, Reset: ${shouldResetDisplay}`);
}

function appendNumber(number) {
    if (currentInput.replace('.', '').length >= 10 && !shouldResetDisplay) return;
    if (currentInput === '0' || shouldResetDisplay) {
        currentInput = String(number);
        shouldResetDisplay = false;
    } else {
        currentInput += String(number);
    }
    updateDisplayAndLog();
}

function appendDecimal() {
    if (shouldResetDisplay) {
        currentInput = '0.';
        shouldResetDisplay = false;
    } else if (!currentInput.includes('.')) {
        if (currentInput.length >= 9) return;
        currentInput += '.';
    }
    updateDisplayAndLog();
}

function chooseOperator(op) {
    if (currentInput === 'Error' || currentInput === 'Error: Div by 0') {
        clearAll();
    }
    if (previousInput !== '' && operator && !shouldResetDisplay) { // 演算子入力前に前の計算を実行
        calculate();
    }
    // エラーでなければ結果を previousInput に保持
    if (currentInput !== 'Error' && currentInput !== 'Error: Div by 0') {
        previousInput = currentInput;
    } else {
        previousInput = ''; // エラー時はクリア
    }
    operator = op;
    shouldResetDisplay = true;
    // console.log(`Operator chosen: ${op}`);
}

function calculate() {
    if (!operator || previousInput === '') {
        // 演算子がない、または前の入力がない場合は何もしない (連続 = の場合は previousInput が結果になっている)
        // もし currentInput が空で previousInput と operator がある場合、
        // currentInput = previousInput として計算する（例: 5 + = の挙動）
        if (operator && previousInput !== '' && (currentInput === '' || shouldResetDisplay)) {
            currentInput = previousInput; // 最後の入力を再利用
            shouldResetDisplay = false; // これから計算するのでリセットフラグは不要
        } else if (!operator && previousInput !== '' && currentInput !== ''){
            // 何もしない（例：数字 数字 =）
            return;
        }
        else {
            return;
        }
    }


    let result;
    const prev = parseFloat(previousInput);
    const current = parseFloat(currentInput);

    if (isNaN(prev) || isNaN(current)) {
        clearAll(); currentInput = "Error"; updateDisplayAndLog(); shouldResetDisplay = true; return;
    }

    switch (operator) {
        case '+': result = prev + current; break;
        case '-': result = prev - current; break;
        case '*': result = prev * current; break;
        case '/':
            if (current === 0) {
                clearAll(); currentInput = "Error: Div by 0"; updateDisplayAndLog(); shouldResetDisplay = true; return;
            }
            result = prev / current;
            break;
        default: return;
    }

    // 結果の整形
    if (Math.abs(result) > 99999999999 || (Math.abs(result) < 0.000000001 && result !== 0)) {
        currentInput = result.toExponential(6); // 指数表記（小数点以下6桁）
    } else {
        currentInput = String(parseFloat(result.toFixed(9))); // 小数点以下9桁まで、不要な0削除
    }
    if (currentInput.length > 12 && !currentInput.includes('e')) { // 指数表記でないのに長すぎる場合
        currentInput = parseFloat(currentInput).toExponential(6);
    }

    // console.log(`Calculation: ${previousInput} ${operator} ${current} = ${currentInput}`);
    operator = null; // 演算子をリセットして連続計算に対応
    previousInput = currentInput; // 結果を次の計算のpreviousInputにする (連続 = や次の演算のため)
    shouldResetDisplay = true;
    updateDisplayAndLog();
}

function clearAll() {
    currentInput = '0';
    previousInput = '';
    operator = null;
    shouldResetDisplay = false;
    updateDisplayAndLog();
    console.log("Calculator cleared.");
}

// --- 初期化処理呼び出し ---
try {
    initThreeJS();
    update3DDisplay(currentInput); // 初期表示を確実に行う
} catch (e) {
    console.error("Unhandled error during script execution:", e);
    const loadingInfo = document.getElementById('loading-info');
    if (loadingInfo) loadingInfo.textContent = "スクリプト実行エラー。コンソールを確認してください。";
}