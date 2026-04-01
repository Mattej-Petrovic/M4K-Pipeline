variable "namespace" {
  description = "Kubernetes namespace for your team"
  type        = string
}

variable "team_name" {
  description = "Human-readable team name"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "redis_image" {
  description = "Redis container image"
  type        = string
  default     = "redis:7-alpine"
}

variable "api_image" {
  description = "API backend container image"
  type        = string
  default     = "gcr.io/chas-devsecops-2026/team-dashboard-api:v1"
}

variable "frontend_image" {
  description = "Frontend container image"
  type        = string
  default     = "gcr.io/chas-devsecops-2026/team-dashboard-frontend:v1"
}

variable "api_replicas" {
  description = "Number of API replicas"
  type        = number
  default     = 2

  validation {
    condition     = var.api_replicas >= 1 && var.api_replicas <= 3
    error_message = "Replicas must be between 1 and 3 (namespace quota limit)."
  }
}

variable "domain" {
  description = "Public hostname for ingress"
  type        = string
  default     = "m4k-gang.chas.retro87.se"
}

variable "enable_tls" {
  description = "Enable cert-manager Certificate and TLS on ingress"
  type        = bool
  default     = false
}

variable "cluster_issuer" {
  description = "cert-manager ClusterIssuer name"
  type        = string
  default     = "letsencrypt-prod"
}

variable "monitor_api_key" {
  description = "API key used by the team monitor"
  type        = string
  sensitive   = true
}
