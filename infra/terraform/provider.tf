provider "kubernetes" {
  config_path = abspath("${path.module}/../../docs/week6/m4k-gang-kubeconfig.yaml")
}
