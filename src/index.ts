import { isNullOrUndefined } from 'util';
import { Db } from 'mongodb';
import { Context, MiddlewareFn } from 'telegraf';
import { getSessionKey, SessionKeyFunction } from './keys';

export type MaybePromise<T> = T | Promise<T>

export type SessionSaveHandler<O, D> = (data: O) => MaybePromise<D>;
export type SessionLoadHandler<O, D> = (data: D) => MaybePromise<O>;

export type SessionOptions<O, D> = {
    sessionName: string;
    collectionName: string;
    sessionKeyFn: SessionKeyFunction;
    serializeHandler: SessionSaveHandler<O, D>; 
    deserializeHandler: SessionLoadHandler<O, D>;
};

function serialize<O, D>(data: O): D {
    return data as unknown as D;
}

function deserialize<O, D>(serializedData: D): O {
    return serializedData as unknown as O;
}

type SessionDocument<D> = {
    key: string;
    data: D;
}

export type SessionContext<K extends string, O extends {}> = Context & { [key in K]: O }

export const session = <C extends Context = Context, O extends {} = {}, D = O>(
    db: Db, 
    sessionOptions?: Partial<SessionOptions<O, D>>
): MiddlewareFn<C> => {
    
    const saveSession = (key: string, data: D): Promise<unknown> => collection.updateOne({ key }, { $set: { data } }, { upsert: true });
    const loadSession = async (key: string): Promise<D | undefined> => (await collection.findOne({ key }))?.data ?? undefined;

    const options: SessionOptions<O, D> = { 
        sessionName: 'session', 
        collectionName: 'sessions', 
        sessionKeyFn: getSessionKey,
        serializeHandler: serialize,
        deserializeHandler: deserialize,
        ...sessionOptions 
    };

    const collection = db.collection<SessionDocument<D>>(options.collectionName);
    
    const { sessionKeyFn: getKey, sessionName } = options;

    return async (ctx: Context, next) => {
        const key = getKey(ctx);
        const data: D = isNullOrUndefined(key) ? undefined : await loadSession(key);

        ctx[sessionName] = isNullOrUndefined(data) ? undefined : await options.deserializeHandler(data);

        await next();

        if (ctx[sessionName] != null) {
            const obj: O = ctx[sessionName];
            await saveSession(key, isNullOrUndefined(obj) ? undefined : await options.serializeHandler(obj));
        }
    };
}