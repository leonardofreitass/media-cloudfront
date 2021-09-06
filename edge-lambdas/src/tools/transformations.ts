import { URLSearchParams } from 'url'

const castAndValidateInt = (value: string, errorPrefix: string): number => {
  const integer = parseInt(value, 10)

  if (!Number.isSafeInteger(integer) || Number(value) !== integer) {
    throw new Error(`${errorPrefix} must be an integer`)
  }

  return integer
}

interface TransformationFunc {
  (value: string): string;
}

const MIN_WIDTH = 1
const MAX_WIDTH = 10000 
const transformWidth: TransformationFunc = (value: string): string => {
  const width = castAndValidateInt(value, "Width")
  if (width < MIN_WIDTH || width > MAX_WIDTH) {
    throw new Error(`Width must be a value between ${MIN_WIDTH} and ${MAX_WIDTH}`)
  }

  return `w_${width}`
}

const MIN_HEIGHT = 1
const MAX_HEIGHT = 10000 
const transformHeight: TransformationFunc = (value: string): string => {
  const height = castAndValidateInt(value, "Height")
  if (height < MIN_HEIGHT || height > MAX_HEIGHT) {
    throw new Error(`Height must be a value between ${MIN_HEIGHT} and ${MAX_HEIGHT}`)
  }

  return `h_${height}`
}

const transformations = new Map<string, TransformationFunc>()
transformations.set('width', transformWidth)
transformations.set('height', transformHeight)

const reduceQueryParam = (acc: string[], [key, val]: [string, string]): string[] => {
  const transformation = transformations.get(key)
  if (!transformation) {
    throw new Error(`Unknown query param ${key}`)
  }

  return [...acc, transformation(val)]
}

export const transformQueryString = (querystring: string): string => {
  const qs = new URLSearchParams(querystring)
  return [...qs.entries()].reduce(reduceQueryParam, []).join(",")
}

export default transformQueryString
