;; Provider Identity Contract
;; Manages healthcare practitioner identities

;; Define data variables
(define-data-var contract-owner principal tx-sender)

;; Define data maps
(define-map providers
  { provider-id: (string-ascii 36) }
  {
    principal: principal,
    name: (string-ascii 100),
    specialty: (string-ascii 100),
    license-number: (string-ascii 50),
    active: bool
  }
)

(define-map provider-principals
  { principal: principal }
  { provider-id: (string-ascii 36) }
)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-ALREADY-REGISTERED u101)
(define-constant ERR-NOT-FOUND u102)

;; Read-only functions
(define-read-only (get-contract-owner)
  (var-get contract-owner)
)

(define-read-only (get-provider (provider-id (string-ascii 36)))
  (map-get? providers { provider-id: provider-id })
)

(define-read-only (get-provider-by-principal (provider-principal principal))
  (match (map-get? provider-principals { principal: provider-principal })
    provider-map (get-provider (get provider-id provider-map))
    none
  )
)

;; Public functions
(define-public (register-provider
    (provider-id (string-ascii 36))
    (name (string-ascii 100))
    (specialty (string-ascii 100))
    (license-number (string-ascii 50)))
  (let ((caller tx-sender))
    (asserts! (is-none (map-get? provider-principals { principal: caller })) (err ERR-ALREADY-REGISTERED))

    (map-set providers
      { provider-id: provider-id }
      {
        principal: caller,
        name: name,
        specialty: specialty,
        license-number: license-number,
        active: true
      }
    )

    (map-set provider-principals
      { principal: caller }
      { provider-id: provider-id }
    )

    (ok true)
  )
)

(define-public (update-provider
    (provider-id (string-ascii 36))
    (name (string-ascii 100))
    (specialty (string-ascii 100))
    (license-number (string-ascii 50)))
  (let ((caller tx-sender)
        (provider-data (map-get? providers { provider-id: provider-id })))

    (asserts! (is-some provider-data) (err ERR-NOT-FOUND))
    (asserts! (is-eq caller (get principal (unwrap! provider-data (err ERR-NOT-FOUND)))) (err ERR-NOT-AUTHORIZED))

    (map-set providers
      { provider-id: provider-id }
      {
        principal: caller,
        name: name,
        specialty: specialty,
        license-number: license-number,
        active: true
      }
    )

    (ok true)
  )
)

(define-public (deactivate-provider (provider-id (string-ascii 36)))
  (let ((caller tx-sender)
        (provider-data (map-get? providers { provider-id: provider-id })))

    (asserts! (is-some provider-data) (err ERR-NOT-FOUND))
    (asserts! (or
      (is-eq caller (get principal (unwrap! provider-data (err ERR-NOT-FOUND))))
      (is-eq caller (var-get contract-owner))
    ) (err ERR-NOT-AUTHORIZED))

    (map-set providers
      { provider-id: provider-id }
      (merge (unwrap! provider-data (err ERR-NOT-FOUND)) { active: false })
    )

    (ok true)
  )
)

(define-public (reactivate-provider (provider-id (string-ascii 36)))
  (let ((caller tx-sender)
        (provider-data (map-get? providers { provider-id: provider-id })))

    (asserts! (is-some provider-data) (err ERR-NOT-FOUND))
    (asserts! (or
      (is-eq caller (get principal (unwrap! provider-data (err ERR-NOT-FOUND))))
      (is-eq caller (var-get contract-owner))
    ) (err ERR-NOT-AUTHORIZED))

    (map-set providers
      { provider-id: provider-id }
      (merge (unwrap! provider-data (err ERR-NOT-FOUND)) { active: true })
    )

    (ok true)
  )
)

;; Initialize contract
(var-set contract-owner tx-sender)
