function command(name, files) {
  return `${name} ${files.map((file) => JSON.stringify(file)).join(' ')}`;
}

export default {
  '*.{js,cjs,mjs,ts,tsx}': (files) => {
    const sourceFiles = files.filter(
      (file) => !file.replaceAll('\\', '/').includes('/.yarn/releases/')
    );

    return sourceFiles.length === 0
      ? []
      : [
          command('eslint --fix', sourceFiles),
          command('prettier --write', sourceFiles),
        ];
  },
  '*.{json,yaml,yml}': (files) => command('prettier --write', files),
};
