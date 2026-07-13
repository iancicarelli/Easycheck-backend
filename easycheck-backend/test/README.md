# Estrategia de pruebas EasyCheck

Las pruebas nuevas se organizan por caso de uso (`CU_01` a `CU_09`) y por
nivel: `unit`, `integration`, `e2e` y `bdd`. Los fixtures compartidos viven en
`SHARED`; seguridad, configuraciÃ³n y regresiones que cruzan varios CU se
mantienen en `CROSS_CUTTING` para evitar duplicar el arranque de Nest.

| CU | Unit | IntegraciÃ³n | BDD | E2E |
| --- | --- | --- | --- | --- |
| CU-01 | sÃ­ | sÃ­ (regresiÃ³n multi-CU) | sÃ­ | sÃ­ |
| CU-02 | sÃ­ | sÃ­ (regresiÃ³n multi-CU) | sÃ­ | sÃ­ |
| CU-03 | sÃ­ | sÃ­ (regresiÃ³n multi-CU) | sÃ­ | sÃ­ |
| CU-04 | sÃ­ | sÃ­ (regresiÃ³n multi-CU) | sÃ­ | sÃ­ |
| CU-05 | sÃ­ | sÃ­ (regresiÃ³n multi-CU) | sÃ­ | sÃ­ |
| CU-06 | sÃ­ | sÃ­ | sÃ­ | sÃ­ |
| CU-07 | sÃ­ | sÃ­ (regresiÃ³n multi-CU) | sÃ­ | sÃ­ |
| CU-08 | sÃ­ | sÃ­ (regresiÃ³n multi-CU) | sÃ­ | sÃ­ |
| CU-09 | sÃ­ | sÃ­ (regresiÃ³n multi-CU) | sÃ­ | sÃ­ |

Comandos principales:

```bash
npm run test:tdd
npm run test:integration
npm run test:bdd
npm run test:e2e
npm run test:cov -- --runInBand
npm run test:performance:load
npm run test:performance:stress
```

Las pruebas E2E arrancan `AppModule`, aplican el mismo `ValidationPipe` de
producciÃ³n y recorren el endpoint principal de cada CU en modo in-memory. Las
pruebas k6 y el dashboard Grafana estÃ¡n documentados en `performance/README.md`.

Convenciones de nombres:

- `*.unit.spec.ts`
- `*.integration.spec.ts`
- `*.e2e-spec.ts`
- `*.steps.ts` junto a su archivo `*.feature`
