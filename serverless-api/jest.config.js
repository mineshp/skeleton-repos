module.exports = {
  clearMocks: true,
  preset: 'jest-dynalite',
  setupFilesAfterEnv: ['./jest.setup.js'],
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
    'jest-watch-suspend'
  ]
};
