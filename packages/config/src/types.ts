export type SnakeToCamelCase<S extends string> =
  S extends `${infer T}_${infer U}`
    ? `${T}${Capitalize<SnakeToCamelCase<U>>}`
    : S;

export type KeysToCamelCase<T> = {
  [K in keyof T as SnakeToCamelCase<string & K>]: T[K] extends object
    ? T[K] extends Array<infer U>
      ? Array<KeysToCamelCase<U>>
      : KeysToCamelCase<T[K]>
    : T[K];
};

export type CamelCaseConfig<T> = KeysToCamelCase<T>;
