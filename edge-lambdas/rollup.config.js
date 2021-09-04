import typescript from 'rollup-plugin-typescript2'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'

const plugins = [
  typescript({
    tsconfig: './tsconfig-build.json'
  }),
  resolve(),
  commonjs(),
  replace({
    'process.env.CLOUDINARY_ID': JSON.stringify(process.env.CLOUDINARY_ID),
    preventAssignment: true
  })
]

function makeEntryPointFor (input) {
  return {
    input,
    output: {
      dir: 'built',
      format: 'cjs'
    },
    plugins
  }
}

export default [
  makeEntryPointFor('./src/origin-request.ts')
]
