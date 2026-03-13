// Defaults T to K if T is undefined.
export type Defaults<T, K> = T extends defined ? T : K;
// Defaults values of T to K if they are undefined, assuming they both extend P
export type DeepDefaults<P, T extends P, K extends P> = { [K2 in keyof P]: Defaults<T[K2], K[K2]> };
// Same as Required<T>, but also ensures the values of T are defined.
export type EnsureRequired<T> = { [K in keyof T]-?: T[K] & defined };
