# Bug report: invoices a cent too high

From Acme's billing team (ticket BILL-311):

> Since we upgraded to 1.4.0, invoices with several line items come out one
> cent too high. 1.3.2 billed them correctly. Invoices with a single line
> item are still right. Our tenant configuration is
> `config/tenants/acme.json`; we haven't changed it this year.

Example from the ticket: three line items of 110 cents each, quantity 1, at
Acme's 5% rate. 1.3.2 billed a total of 347 cents; 1.4.0 bills 348.
