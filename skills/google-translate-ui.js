"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const app_1 = __importDefault(require("../app"));
const utils_1 = require("../utils");
const slashTranslate = 'slash-translate';
const slashCmd = '/tl';
const actionTranslate = 'action-translate';
function parseCmd(cmd) {
    const pattern = /(\/tl)(\s+(af|sq|am|ar|hy|az|eu|be|bn|bs|bg|ca|ceb|ny|zh-cn|zh-tw|co|hr|cs|da|nl|en|eo|et|tl|fi|fr|fy|gl|ka|de|el|gu|ht|ha|haw|iw|hi|hmn|hu|is|ig|id|ga|it|ja|jw|kn|kk|km|ko|ku|ky|lo|la|lv|lt|lb|mk|mg|ms|ml|mt|mi|mr|mn|my|ne|no|ps|fa|pl|pt|ma|ro|ru|sm|gd|sr|st|sn|sd|si|sk|sl|so|es|su|sw|sv|tg|ta|te|th|tr|uk|ur|uz|vi|cy|xh|yi|yo|zu)\s+([^\n]+))?/gi;
    let res = {
        role: 'translator',
        cmd: 'translate',
    };
    let matches = pattern.exec(cmd.trim());
    if (matches) {
        res['from'] = 'auto';
        if (matches[3])
            res['to'] = matches[3];
        if (matches[4])
            res['text'] = matches[4];
    }
    return res;
}
function doTranslate4Slash(bot, message, args) {
    app_1.default.instance.seneca.act(args, function (err, res) {
        if (err) {
            app_1.default.instance.getLogger().error(err);
            showError4Slash(bot, message, utils_1.l('err.General'));
        }
        else {
            show4Slash(bot, message, res.text);
        }
    });
    track('slash', args.to, args.text);
}
function showDialog(bot, message, opt) {
    let dialog = bot.createDialog(utils_1.l('msg.formTranslate.Title'), opt.id, utils_1.l('msg.formTranslate.Translate'));
    let toLangs = new Array();
    Object.keys(utils_1.langs).forEach(k => toLangs.push({ label: utils_1.langs[k], value: k }));
    let fromLangs = toLangs.slice();
    fromLangs.unshift({ label: utils_1.l('msg.formTranslate.Auto'), value: 'auto' });
    dialog.addSelect(utils_1.l('msg.formTranslate.From'), 'from', 'auto', fromLangs, { optional: true });
    dialog.addSelect(utils_1.l('msg.formTranslate.To'), 'to', opt.to, toLangs, { placeholder: utils_1.l('msg.formTranslate.ToHint') });
    dialog.addTextarea(utils_1.l('msg.formTranslate.Text'), 'text', opt.text, { hint: utils_1.l('msg.formTranslate.TextHint') });
    bot.replyWithDialog(message, dialog.asObject(), function (err, res) {
        if (err)
            app_1.default.instance.getLogger().error(res);
    });
}
function show4Slash(bot, message, text) {
    bot.replyPublic(message, text);
}
function showError4Slash(bot, message, err) {
    bot.replyPrivate(message, err);
}
function track(event, lang, text) {
    app_1.default.instance.track('translate', {
        event: event,
        lang: lang,
        text: text
    });
}
module.exports = function (controller) {
    controller.on('slash_command', function (bot, message) {
        if (message.command == slashCmd) {
            let args = parseCmd(`/tl ${message.text}`);
            if (args.to && args.text) {
                // Do the translation
                doTranslate4Slash(bot, message, args);
            }
            else {
                // Show translate dialog                
                bot.replyAcknowledge();
                showDialog(bot, message, { id: slashTranslate, to: app_1.default.instance.lang, text: '' });
            }
        }
    });
    controller.on('message_action', function (bot, message) {
        let id = message.callback_id;
        if (id == actionTranslate) {
            bot.replyAcknowledge();
            let text = message.message.text;
            showDialog(bot, message, { id: actionTranslate, to: app_1.default.instance.lang, text: text });
        }
    });
    controller.on('dialog_submission', function (bot, message) {
        let id = message.callback_id;
        if (id == slashTranslate || id == actionTranslate) {
            let args = message.submission;
            args.role = 'translator';
            args.cmd = 'translate';
            if (!args.from)
                args.from = 'auto';
            app_1.default.instance.seneca.act(args, function (err, res) {
                let result = err ? utils_1.l('err.General') : res.text;
                bot.replyInteractive(message, result);
                bot.dialogOk();
            });
            track('dialog', args.to, args.text);
        }
    });
};
