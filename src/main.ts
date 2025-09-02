function launch(file: string) {
  import(`./${file}/${file}.ts`).then((module) => {
    module.default();
  });
}

launch("intro_loading_progress");
