function launch(file: string) {
  import(`./${file}/${file}.ts`).then((module) => {
    module.default();
  });
}

launch("performance_tips");
