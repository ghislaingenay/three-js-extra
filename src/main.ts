function launch(file: string) {
  import(`./${file}/${file}.ts`).then((module) => {
    module.default();
  });
}

launch("mixing_html_webgl");
