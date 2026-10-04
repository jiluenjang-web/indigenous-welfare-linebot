# 福利行動導航 LINE Bot 介面模擬

這是純 HTML、CSS、JavaScript 網站。用 VS Code 開啟 `dist` 資料夾後，在 Mac 終端機執行 `open index.html` 即可預覽；不需要 `npm run dev`。

手機畫面右上角可切換中文、海岸阿美語、賽考利克泰雅語，切換時會重新開始示範對話。網站已加入 [Formosan-AI](https://github.com/i3thuan5/Formosan-AI) 的本機翻譯資料層；`nllb-600m-formosan-all-finetune-v2` 模型已為目前 184 組介面文字產生兩種族語初譯，結果存放在 `dist/translations.js`。使用者瀏覽網站時不需連線翻譯，也不會將輸入內容送至外部服務。

**重要：完整族語內容是 AI 初譯，尚未經族語教師逐句校對，不可單獨作為福利申請、資格、金額、期限或文件要求的依據。正式使用前應由對應語別的族語教師與在地使用者完成校對，並保留中文及官方來源。**

- 海岸阿美語：`Nga’ay ho!`、`Padangen ako kiso?`（需要我幫忙嗎？）
- 賽考利克泰雅語：`lokah su!`、`pragun misu ga?`（請問需要幫忙嗎？）

資料來源：[Formosan-AI](https://github.com/i3thuan5/Formosan-AI)、[族語 E 樂園〈生活常用語〉](https://web.klokah.tw/lifesentences/)、[海岸阿美語求助句](https://web.klokah.tw/extension/con_practice/index.php?d=3&l=21&view=dialogue)、[賽考利克泰雅語求助句](https://web.klokah.tw/extension/con_practice/index.php?d=6&l=7&view=dialogue)。正式用於桃園市原住民集會所前，仍需請當地使用者或族語教師確認語別、拼寫及完整介面文案。

新圖示位於 `dist/assets/資訊平權ICON.jpg`，並用於網站 favicon、聊天機器人頭像與訊息頭像。

## 本機 Formosan-AI 模型

大型模型與 Python 環境只存放在本機，不會加入 Git：

- 模型：`models/nllb-600m-formosan-all-finetune-v2/`
- Python 環境：`.venv/`
- 完整重建指令：`./tools/rebuild-local-translations.sh`

重建指令會重新擷取介面文字，使用本機模型產生海岸阿美語與賽考利克泰雅語初譯，再更新 `dist/translations.js`。第一次載入模型需要較長時間；產生完畢後，純靜態網站不需啟動模型即可顯示翻譯。

模型權重採 CC BY-NC 4.0，使用及展示時應標示來源，且不可直接用於商業用途。模型輸出仍可能有誤，正式服務前必須由對應語別的族語教師校對。

本原型專注三條完整使用流程：

1. 找福利：以生活情境分類，顯示適用對象、步驟、官方來源與查核日。
2. 申請準備：資格自評、可勾選文件清單、辦理方式。
3. 真人協助：問題分類、區域選擇、電話與官方窗口導向。

介面已加入高齡友善與容錯功能：

- 可操作的「回上一步」與「回首頁」。
- 中、大、特大字級，並支援按鈕或長按訊息進行系統語音試讀。
- 族語模式在每張資訊卡保留可展開的中文對照。
- 找不到結果、資料超過 90 天未查核、官方連結無法開啟的後續處理。
- 每條流程的步驟進度條、文件勾選進度與申請完成摘要。
- 申請摘要可複製給家人或服務人員，且保留來源與查核日。
- 所有動作按鈕皆允許族語長字串換行，避免在小螢幕溢出。

「桃園市原民敬老卡」用來示範完整申請流程，並連結官方來源；其他福利目前是流程示範。系統不會代替政府機關審核，也不應收集身分證號、病歷或金融帳戶等敏感資料。

## 福利資料盤點

第一批已核對 8 項桃園市原住民長者相關福利，結構化資料位於 `data/welfare-benefits.json`，盤點說明位於 `docs/welfare-data-audit.md`。每項資料保留官方來源、查核日與受理狀態。

前台已改由這份資料產生福利卡片、資格說明、文件清單、申請步驟、受理狀態與官方來源。`dist/welfare-data.js` 是自動產生的離線版本，讓使用者直接開啟 `dist/index.html` 時也能正常使用，不必架設後端。

更新福利資料後，請在專案根目錄執行：

```bash
node tools/build-welfare-data.mjs
```

Mac 使用者也可以直接雙擊 `更新福利資料.command`。看到「福利資料已更新到前台」後，重新整理網頁即可。請只編輯 `data/welfare-benefits.json`，不要直接修改自動產生的 `dist/welfare-data.js`。
