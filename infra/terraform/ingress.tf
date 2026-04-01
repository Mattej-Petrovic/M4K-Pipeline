resource "kubernetes_ingress_v1" "team_dashboard" {
  metadata {
    name      = "team-dashboard"
    namespace = var.namespace
    labels = {
      app = "team-dashboard"
    }

    annotations = var.enable_tls ? {
      "kubernetes.io/ingress.class"                    = "nginx"
      "cert-manager.io/cluster-issuer"                 = var.cluster_issuer
      "nginx.ingress.kubernetes.io/force-ssl-redirect" = "true"
      "nginx.ingress.kubernetes.io/ssl-protocols"      = "TLSv1.2 TLSv1.3"
      } : {
      "kubernetes.io/ingress.class" = "nginx"
    }
  }

  spec {
    dynamic "tls" {
      for_each = var.enable_tls ? [1] : []
      content {
        hosts       = [var.domain]
        secret_name = "team-dashboard-tls"
      }
    }

    rule {
      host = var.domain
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = module.frontend.service_name
              port {
                number = 80
              }
            }
          }
        }
      }
    }
  }

  depends_on = [module.frontend]
}

resource "kubernetes_manifest" "team_dashboard_certificate" {
  count = var.enable_tls ? 1 : 0

  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "Certificate"
    metadata = {
      name      = "team-dashboard-tls"
      namespace = var.namespace
      labels = {
        app        = "team-dashboard"
        managed-by = "terraform"
      }
    }
    spec = {
      secretName = "team-dashboard-tls"
      issuerRef = {
        name = var.cluster_issuer
        kind = "ClusterIssuer"
      }
      dnsNames = [var.domain]
      usages   = ["digital signature", "key encipherment"]
    }
  }
}
