<!-- kaynak: https://ikas.dev/docs/theme/api/models/ikas-raffle-participant -->

# IkasRaffleParticipant extends IkasBaseModel

`customerId`string | null

`raffleId`string

`firstName`string

`lastName`string

`fullName`string | null

`email`string

`applicationDate`number

`phone`string | null

`isDeliveredCargo`boolean | null

`raffle`IkasRaffle | null

Refer to the IkasRaffle reference.

`status`IkasRaffleParticipantStatus | null

Refer to the IkasRaffleParticipantStatus reference.

`extraData`Record<string, any> | null

`appliedProduct`IkasRaffleAppliedProduct

Refer to the IkasRaffleAppliedProduct reference.
