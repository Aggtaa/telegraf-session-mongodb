import { isNullOrUndefined } from 'util';
import { Context } from "telegraf";

export type SessionKeyFunction = (ctx: Context) => string | null;

// Mocking the behaviour from the default memory session implementation.
// Source: https://telegraf.js.org/modules.html#session

// This is possible due to getters that fetch 'from' and 'chat' values from different sources.

export const getSessionKey = ({ from, chat }: Context): string | null => {
    if (from == null || chat == null) {
        return null;
    }

    return `${from.id}:${chat.id}`;
};

/**
 * @deprecated Use getSessionKey function and follow the default logic from the official documentation.
 */
export const getLegacySessionKey = (ctx: Context): string | null => {
    const { chat, callbackQuery, from } = ctx;

    if (isNullOrUndefined(from))
        return null;

    if (chat && chat.type === 'channel' && !from) {
        return `ch:${chat.id}`;
    }

    const id = chat ? chat.id : (callbackQuery ? callbackQuery.chat_instance : from.id);

    return `${id}:${from.id}`;
};
