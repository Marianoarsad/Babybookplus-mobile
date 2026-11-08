module.exports = {
  root: true,
  extends: '@react-native',
  // Preserve reference formatting in the copied application and its checks.
  overrides: [{files: ['scripts/*.cjs'], parserOptions: {ecmaVersion: 2022}, rules: {'prettier/prettier':'off'}}, {files: ['src/**/*.js', 'src/**/*.cjs'], rules: {'prettier/prettier': 'off'}}],
};
