const df = require("durable-functions");

module.exports = df.orchestrator(function* (context) {
    const list = context.df.getInput() || [];
    const value = yield context.df.waitForExternalEvent('AddToTemplate');

    if (value.startsWith('FinishMakingTemplate')) {
        // 完成したリストをReplyトークンとともに返信Activityに渡す
        const token = value.Replace('FinishMakingTemplate_', '');
        yield context.df.callActivity('SendTemplates', { token: token, list: list });

    } else {
        // リストにセリフを追加しオーケストレーターを再実行
        list.push(value);
        context.df.continueAsNew(list);
    }
});