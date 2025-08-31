function launch(file: string) {
  import(`./${file}/${file}.ts`).then((module) => {
    module.default();
  });
}

launch("procedural_terrain");
