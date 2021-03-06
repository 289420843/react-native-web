const moduleMap = require('./moduleMap');

const isCommonJS = opts => opts.commonjs === true;

const getDistLocation = (importName, opts) => {
  const format = isCommonJS(opts) ? 'cjs/' : '';
  if (importName === 'index') {
    return `react-native-web/dist/${format}index`;
  } else if (importName && opts.customMap && opts.customMap[importName]) {
    return opts.customMap[importName];
  } else if (importName && moduleMap[importName]) {
    return `react-native-web/dist/${format}exports/${importName}`;
  }
};

const isReactNativeRequire = (t, node) => {
  const { declarations } = node;
  if (declarations.length > 1) {
    return false;
  }
  const { id, init } = declarations[0];
  return (
    (t.isObjectPattern(id) || t.isIdentifier(id)) &&
    t.isCallExpression(init) &&
    t.isIdentifier(init.callee) &&
    init.callee.name === 'require' &&
    init.arguments.length === 1 &&
    (init.arguments[0].value === 'react-native' ||
      init.arguments[0].value === 'react-native-web' ||
      init.arguments[0].value.endsWith('/react-native'))
  );
};

const isReactNativeModule = ({ source, specifiers }) =>
  source &&
  (source.value === 'react-native' ||
    source.value === 'react-native-web' ||
    source.value.endsWith('/react-native')) &&
  specifiers.length;

module.exports = function({ types: t }) {
  return {
    name: 'Rewrite react-native to react-native-web',
    visitor: {
      ImportDeclaration(path, state) {
        const { specifiers } = path.node;
        if (isReactNativeModule(path.node)) {
          const imports = specifiers
            .map(specifier => {
              if (t.isImportSpecifier(specifier)) {
                const importName = specifier.imported.name;
                const distLocation = getDistLocation(importName, state.opts);

                if (distLocation) {
                  return t.importDeclaration(
                    [t.importDefaultSpecifier(t.identifier(specifier.local.name))],
                    t.stringLiteral(distLocation)
                  );
                }
              }
              return t.importDeclaration(
                [specifier],
                t.stringLiteral(getDistLocation('index', state.opts))
              );
            })
            .filter(Boolean);

          path.replaceWithMultiple(imports);
        }
      },
      ExportNamedDeclaration(path, state) {
        const { specifiers } = path.node;
        if (isReactNativeModule(path.node)) {
          const exports = specifiers
            .map(specifier => {
              if (t.isExportSpecifier(specifier)) {
                const exportName = specifier.exported.name;
                const localName = specifier.local.name;
                const distLocation = getDistLocation(localName, state.opts);

                if (distLocation) {
                  return t.exportNamedDeclaration(
                    null,
                    [t.exportSpecifier(t.identifier('default'), t.identifier(exportName))],
                    t.stringLiteral(distLocation)
                  );
                }
              }
              return t.exportNamedDeclaration(
                null,
                [specifier],
                t.stringLiteral(getDistLocation('index', state.opts))
              );
            })
            .filter(Boolean);

          path.replaceWithMultiple(exports);
        }
      },
      VariableDeclaration(path, state) {
        if (isReactNativeRequire(t, path.node)) {
          const { id } = path.node.declarations[0];
          if (t.isObjectPattern(id)) {
            const imports = id.properties
              .map(identifier => {
                const distLocation = getDistLocation(identifier.key.name, state.opts);
                if (distLocation) {
                  return t.variableDeclaration(path.node.kind, [
                    t.variableDeclarator(
                      t.identifier(identifier.value.name),
                      t.memberExpression(
                        t.callExpression(t.identifier('require'), [t.stringLiteral(distLocation)]),
                        t.identifier('default')
                      )
                    )
                  ]);
                }
              })
              .filter(Boolean);

            path.replaceWithMultiple(imports);
          } else if (t.isIdentifier(id)) {
            const name = id.name;
            const matchList = path.hub.file.code.match(
              new RegExp(`(?<=[^a-zA-Z0-9_]${name}\\.)[a-zA-Z0-9_]+`, 'g')
            );
            if (matchList && matchList.length > 0) {
              const moduleNames = {};
              const noFindNames = {};
              matchList &&
                matchList.map(m => {
                  if (
                    moduleMap.hasOwnProperty(m) ||
                    (state.opts.customMap && state.opts.customMap.hasOwnProperty(m))
                  ) {
                    moduleNames[m] = true;
                  } else {
                    noFindNames[m] = true;
                  }
                });
              const keys = Object.keys(moduleNames);
              const nokeys = Object.keys(noFindNames);
              // keys.map(key => {
              //     path.insertBefore(
              //         t.variableDeclaration(path.node.kind, [
              //             t.variableDeclarator(
              //                 t.identifier(key),
              //                     t.callExpression(t.identifier('require'), [
              //                         t.stringLiteral(getDistLocation(key, state.opts))
              //                     ])
              //             )
              //         ])
              //     );
              // });
              keys.map(key => {
                path.insertBefore(
                  t.importDeclaration(
                    [t.importDefaultSpecifier(t.identifier(key))],
                    t.stringLiteral(getDistLocation(key, state.opts))
                  )
                );
              });
              path.insertBefore(
                t.variableDeclaration(path.node.kind, [
                  t.variableDeclarator(
                    t.identifier(name),
                    t.objectExpression(
                      keys
                        .map(key => t.objectProperty(t.identifier(key), t.identifier(key)))
                        .concat(
                          nokeys.map(key =>
                            t.objectProperty(t.identifier(key), t.identifier('undefined'))
                          )
                        )
                    )
                  )
                ])
              );
            }
            path.remove();
          }
        }
      }
    }
  };
};
